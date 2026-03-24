import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { generateStrategicCampaign, type BriefInput, type BrandProfileForStrategic } from "@/lib/agent/strategicCampaignGenerator";
import { runGenerationPipeline } from "@/lib/generation/orchestrator";
import { brandIntelligenceColors, brandIntelligenceFonts, brandIntelligencePersonalityString, brandRowToIntelligence } from "@/lib/brand-intelligence";

type CreateCampaignBody = {
  brandId: string;
  mode: "quick-plan" | "full-generate";
  goal?: string;
  brief?: Record<string, unknown>;
  additionalPrompt?: string;
  campaignId?: string;
};

function toBrief(body: Partial<CreateCampaignBody>): BriefInput {
  if (body.brief && typeof body.brief === "object" && (body.brief as { type?: string }).type === "advanced") {
    const b = body.brief as Record<string, unknown>;
    return {
      type: "advanced",
      goal: String(b.goal || body.goal || "Increase awareness"),
      platform: Array.isArray(b.platform) ? b.platform.map(String) : ["Multi-platform"],
      timeline: String(b.timeline || "2 weeks"),
      budget: String(b.budget || "Organic only"),
      description: typeof b.description === "string" ? b.description : undefined,
    };
  }
  if (body.brief && typeof body.brief === "object" && (body.brief as { type?: string }).type === "quick") {
    const b = body.brief as Record<string, unknown>;
    return { type: "quick", description: String(b.description || body.goal || "Increase awareness") };
  }
  return { type: "quick", description: String(body.goal || "Increase awareness") };
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ success: false, data: null, error: "Sign in required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Partial<CreateCampaignBody>;
    if (!body.mode || (body.mode !== "quick-plan" && body.mode !== "full-generate")) {
      return NextResponse.json({ error: "mode must be 'quick-plan' or 'full-generate'." }, { status: 400 });
    }
    if (!body.brandId) {
      return NextResponse.json({ success: false, data: null, error: "brandId is required." }, { status: 400 });
    }

    const brandRow = await prisma.brand.findFirst({
      where: { id: body.brandId, userId: user.id },
    });
    if (!brandRow) {
      return NextResponse.json({ success: false, data: null, error: "Brand not found." }, { status: 404 });
    }

    if (body.mode === "quick-plan") {
      const bi = brandRowToIntelligence(brandRow);
      const brandProfile: BrandProfileForStrategic = {
        name: brandRow.name,
        description: brandRow.description ?? undefined,
        tagline: brandRow.tagline ?? undefined,
        personality: brandIntelligencePersonalityString(bi) ?? brandRow.personality ?? undefined,
        tone: bi.toneOfVoice ?? brandRow.tone ?? undefined,
        visualStyle: bi.visualStyle ?? undefined,
        industry: brandRow.industry ?? undefined,
        targetAudience: brandRow.targetAudience ?? undefined,
      };
      const plan = await generateStrategicCampaign(brandProfile, toBrief(body), body.additionalPrompt);
      const campaign = await prisma.$transaction(async (tx) => {
        const camp = await tx.campaign.create({
          data: {
            userId: user.id,
            brandId: brandRow.id,
            title: plan.campaignName.slice(0, 200),
            goal: (body.goal || plan.objective).slice(0, 500),
            strategySummary: plan.strategySummary.slice(0, 2000),
            objective: plan.objective.slice(0, 500),
            mode: "quick",
            duration: plan.duration.slice(0, 100),
            status: "draft",
            assetPlanSnapshot: JSON.stringify(plan.assetPlan),
          },
        });
        for (const item of plan.assetPlan) {
          await tx.asset.create({
            data: {
              userId: user.id,
              brandId: brandRow.id,
              campaignId: camp.id,
              url: null,
              label: `${item.assetType.replace(/_/g, " ")} · ${item.platform}`.slice(0, 200),
              type: "social",
              width: 1024,
              height: 1024,
              status: "pending",
              ideaType: item.assetType,
              blueprint: JSON.stringify(item),
            },
          });
        }
        return camp;
      });
      return NextResponse.json({
        success: true,
        data: {
          campaignId: campaign.id,
          plan,
          assets: [],
        },
        error: null,
      });
    }

    let campaignId = body.campaignId || null;
    if (!campaignId) {
      const planRes = await POST(
        new NextRequest(request.url, {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify({
            brandId: body.brandId,
            mode: "quick-plan",
            goal: body.goal,
            brief: body.brief,
            additionalPrompt: body.additionalPrompt,
          }),
        })
      );
      const planPayload = (await planRes.json().catch(() => ({}))) as { data?: { campaignId?: string }; error?: string };
      if (!planRes.ok || !planPayload.data?.campaignId) {
        return NextResponse.json(
          { success: false, data: null, error: planPayload.error || "Failed to create campaign plan." },
          { status: 500 }
        );
      }
      campaignId = planPayload.data.campaignId;
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: user.id },
      include: { assets: { where: { status: "pending" }, orderBy: { createdAt: "asc" } } },
    });
    if (!campaign) {
      return NextResponse.json({ success: false, data: null, error: "Campaign not found." }, { status: 404 });
    }
    if (!campaign.assets.length) {
      return NextResponse.json({ success: false, data: null, error: "No pending assets to generate." }, { status: 400 });
    }

    const bi = brandRowToIntelligence(brandRow);
    const orchestratorBrand = {
      name: brandRow.name,
      tagline: brandRow.tagline ?? undefined,
      description: brandRow.description ?? undefined,
      colors: brandIntelligenceColors(bi),
      fonts: brandIntelligenceFonts(bi),
      personality: brandIntelligencePersonalityString(bi) ?? undefined,
      tone: bi.toneOfVoice ?? undefined,
      visualStyleSummary: bi.visualStyle ?? undefined,
      logos: [],
      strategyProfile: undefined,
    };

    for (let i = 0; i < campaign.assets.length; i++) {
      const asset = campaign.assets[i];
      await prisma.asset.update({ where: { id: asset.id }, data: { status: "generating" } });
      const result = await runGenerationPipeline({
        brand: orchestratorBrand,
        ideaType: asset.ideaType ?? "linkedin_post",
        userPrompt: `${asset.label}. Premium ideas mode: bold original concept, campaign-grade composition, premium aesthetics, ultra-detailed 4K-ready finish.`,
        sessionId: `campaign-${campaign.id}-${i}`,
      });
      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          url: result.imageUrl ?? null,
          status: result.imageUrl ? "complete" : "failed",
          prompt: result.finalPrompt,
          finalPrompt: result.finalPrompt,
          type: "social",
          width: result.width,
          height: result.height,
        },
      });
    }

    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "complete" } });
    const completed = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { assets: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        campaign: completed,
        assets: completed?.assets ?? [],
      },
      error: null,
    });
  } catch (error) {
    console.error("[api/campaigns/create] error:", error);
    return NextResponse.json(
      { success: false, data: null, error: "Campaign creation failed." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import {
  generateStrategicCampaign,
  type BriefInput,
  type BrandProfileForStrategic,
} from "@/lib/agent/strategicCampaignGenerator";
import {
  brandIntelligenceColors,
  brandIntelligenceFonts,
  brandIntelligencePersonalityString,
  brandRowToIntelligence,
} from "@/lib/brand-intelligence";
import { generateImageWithReplicate } from "@/lib/ai-generator";

export const maxDuration = 60;

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

// Build a rich brand-aware prompt for asset generation (no Puppeteer required)
function buildAssetPrompt(
  brand: {
    name: string;
    colors: string[];
    fonts: string[];
    personality?: string | null;
    tone?: string | null;
    visualStyle?: string | null;
    description?: string | null;
    tagline?: string | null;
    targetAudience?: string | null;
  },
  assetLabel: string,
  assetType: string,
  platform: string
): string {
  const parts: string[] = [];
  parts.push(`${assetType.replace(/_/g, " ")} for ${platform}`);
  parts.push(assetLabel);
  if (brand.name) parts.push(`brand: ${brand.name}`);
  if (brand.colors.length) {
    parts.push(`brand colors: ${brand.colors.slice(0, 4).join(", ")}`);
  }
  if (brand.fonts.length) {
    parts.push(`typography: ${brand.fonts.slice(0, 2).join(", ")}`);
  }
  if (brand.visualStyle) parts.push(`visual style: ${brand.visualStyle}`);
  if (brand.tone || brand.personality) {
    const mood = [brand.tone, brand.personality].filter(Boolean).join(", ");
    parts.push(`mood: ${mood}`);
  }
  if (brand.description) parts.push(brand.description.split(".")[0]);
  if (brand.tagline) parts.push(`tagline: "${brand.tagline}"`);
  parts.push("professional commercial design, polished, high quality, campaign-grade composition, brand-consistent");
  return parts.join(". ");
}

// Aspect ratio by platform
function platformToAspectRatio(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes("instagram") && p.includes("story")) return "9:16";
  if (p.includes("instagram")) return "1:1";
  if (p.includes("linkedin")) return "4:5";
  if (p.includes("youtube")) return "16:9";
  if (p.includes("facebook")) return "4:5";
  if (p.includes("twitter") || p.includes("x ")) return "16:9";
  if (p.includes("pinterest")) return "2:3";
  return "1:1";
}

async function createCampaignPlan(
  user: { id: string },
  brandRow: Awaited<ReturnType<typeof prisma.brand.findFirst>> & object,
  body: Partial<CreateCampaignBody>
): Promise<{ campaignId: string; plan: Awaited<ReturnType<typeof generateStrategicCampaign>> }> {
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

  return { campaignId: campaign.id, plan };
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

    // ── quick-plan: generate strategy + create placeholder assets ──────────────
    if (body.mode === "quick-plan") {
      const { campaignId, plan } = await createCampaignPlan(user, brandRow, body);
      return NextResponse.json({
        success: true,
        data: { campaignId, plan, assets: [] },
        error: null,
      });
    }

    // ── full-generate: plan first (or use existing), then generate images ──────
    let campaignId = body.campaignId ?? null;
    let plan: Awaited<ReturnType<typeof generateStrategicCampaign>> | null = null;

    if (!campaignId) {
      const result = await createCampaignPlan(user, brandRow, body);
      campaignId = result.campaignId;
      plan = result.plan;
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
    const brandForGeneration = {
      name: brandRow.name,
      tagline: brandRow.tagline ?? undefined,
      description: brandRow.description ?? undefined,
      colors: brandIntelligenceColors(bi),
      fonts: brandIntelligenceFonts(bi),
      personality: brandIntelligencePersonalityString(bi) ?? brandRow.personality ?? undefined,
      tone: bi.toneOfVoice ?? brandRow.tone ?? undefined,
      visualStyle: bi.visualStyle ?? undefined,
      targetAudience: bi.targetAudience ?? undefined,
    };

    const token = (process.env.REPLICATE_API_TOKEN ?? "").trim();

    // Generate each pending asset directly with Replicate (no Puppeteer)
    for (const asset of campaign.assets) {
      await prisma.asset.update({ where: { id: asset.id }, data: { status: "generating" } });

      let assetPlan: { assetType?: string; platform?: string; headlineConcept?: string } = {};
      try {
        assetPlan = asset.blueprint ? (JSON.parse(asset.blueprint) as typeof assetPlan) : {};
      } catch { /* ignore */ }

      const assetType = assetPlan.assetType ?? asset.ideaType ?? "social_post";
      const platform = assetPlan.platform ?? "Multi-platform";
      const conceptLabel = assetPlan.headlineConcept ?? asset.label;

      const prompt = buildAssetPrompt(brandForGeneration, conceptLabel, assetType, platform);
      const aspectRatio = platformToAspectRatio(platform);

      let imageUrl: string | null = null;
      let width = 1024;
      let height = 1024;

      if (token) {
        imageUrl = await generateImageWithReplicate(token, prompt, aspectRatio).catch(() => null);
        // Set dimensions from aspect ratio
        const dims: Record<string, { w: number; h: number }> = {
          "1:1": { w: 1024, h: 1024 },
          "9:16": { w: 768, h: 1344 },
          "16:9": { w: 1344, h: 768 },
          "4:5": { w: 1024, h: 1280 },
          "2:3": { w: 832, h: 1248 },
        };
        const d = dims[aspectRatio];
        if (d) { width = d.w; height = d.h; }
      }

      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          url: imageUrl,
          status: imageUrl ? "complete" : "failed",
          finalPrompt: prompt,
          prompt,
          type: "social",
          width,
          height,
        },
      });

      // Deduct 1 credit per successfully generated asset
      if (imageUrl) {
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { decrement: 1 } },
        }).catch(() => { /* non-fatal */ });
      }
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

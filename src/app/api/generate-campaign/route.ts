import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { planCampaign } from "@/lib/agent/campaignPlanner";
import { executeCampaign } from "@/lib/agent/campaignExecutor";
import { evaluateConsistency } from "@/lib/agent/consistencyEvaluator";
import { runBrandStrategist } from "@/lib/agent/brandStrategistAgent";
import { brandRowToIntelligence, brandIntelligenceColors, brandIntelligenceFonts, brandIntelligencePersonalityString } from "@/lib/brand-intelligence";
import { getCampaignMemory } from "@/lib/strategy/campaignMemory";
import { parseDesignConstraints } from "@/lib/strategy/constraintValidator";
import type { OrchestratorBrand } from "@/lib/generation/orchestrator";

function toOrchestratorBrand(
  row: Parameters<typeof brandRowToIntelligence>[0] & { logos?: string | null; strategyProfile?: string | null }
): OrchestratorBrand {
  const bi = brandRowToIntelligence(row);
  let logos: string[] | undefined;
  try {
    logos = row.logos ? (typeof row.logos === "string" ? JSON.parse(row.logos) : row.logos) : undefined;
  } catch {
    logos = undefined;
  }
  let strategyProfile: Record<string, unknown> | undefined;
  try {
    if (row.strategyProfile) strategyProfile = JSON.parse(row.strategyProfile as string) as Record<string, unknown>;
  } catch {
    // ignore
  }
  return {
    name: row.name,
    tagline: row.tagline ?? undefined,
    description: row.description ?? undefined,
    colors: brandIntelligenceColors(bi),
    fonts: brandIntelligenceFonts(bi).length ? brandIntelligenceFonts(bi) : undefined,
    personality: brandIntelligencePersonalityString(bi) ?? undefined,
    tone: bi.toneOfVoice ?? undefined,
    visualStyleSummary: bi.visualStyle ?? undefined,
    logos,
    strategyProfile,
  };
}

/**
 * POST /api/generate-campaign
 * Body: { brandId, campaignGoal, campaignType }
 * Flow: validate → planCampaign → executeCampaign → store campaign + assets → evaluateConsistency → update score → return campaign.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId, campaignGoal, campaignType } = body as {
      brandId?: string;
      campaignGoal?: string;
      campaignType?: string;
    };

    const user = await resolveAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Sign in required to generate campaigns." }, { status: 401 });
    }

    if (!brandId || typeof brandId !== "string") {
      return NextResponse.json({ error: "brandId is required." }, { status: 400 });
    }

    const brandRow = await prisma.brand.findFirst({
      where: { id: brandId, userId: user.id },
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        colors: true,
        fonts: true,
        logos: true,
        personality: true,
        tone: true,
        visualStyle: true,
        primaryColor: true,
        secondaryColors: true,
        headingFont: true,
        bodyFont: true,
        toneOfVoice: true,
        personalityTraits: true,
        targetAudience: true,
        industry: true,
        brandArchetype: true,
        deepAnalysis: true,
        strategyProfile: true,
        isBrandLockEnabled: true,
        designConstraints: true,
      },
    });

    if (!brandRow) {
      return NextResponse.json({ error: "Brand not found or access denied." }, { status: 404 });
    }

    const goal = (typeof campaignGoal === "string" && campaignGoal.trim()) ? campaignGoal.trim() : "Increase awareness and engagement";
    const type = (typeof campaignType === "string" && campaignType.trim()) ? campaignType.trim().toLowerCase() : "growth";

    const bi = brandRowToIntelligence(brandRow as Parameters<typeof brandRowToIntelligence>[0]);
    let strategyProfile: { messagingAngles?: string[] } | undefined;
    try {
      if (brandRow.strategyProfile) {
        const sp = JSON.parse(brandRow.strategyProfile as string) as Record<string, unknown>;
        strategyProfile = { messagingAngles: sp.messagingAngles as string[] | undefined };
      }
    } catch {
      // ignore
    }
    const brandForPlanner = {
      name: brandRow.name,
      description: brandRow.description ?? undefined,
      tagline: brandRow.tagline ?? undefined,
      personality: brandIntelligencePersonalityString(bi) ?? undefined,
      tone: bi.toneOfVoice ?? undefined,
      visualStyleSummary: bi.visualStyle ?? undefined,
      messagingAngles: strategyProfile?.messagingAngles,
    };

    // 0. AI Brand Strategist: produce strategic blueprint (emotional tone, persona, visual direction, content angles)
    const strategyBlueprint = await runBrandStrategist(bi, goal, `Campaign type: ${type}.`);

    // 1. Plan campaign (3–6 assets) aligned with strategy
    const plan = await planCampaign(brandForPlanner, goal, type, strategyBlueprint);
    const assetCount = Math.min(6, Math.max(3, plan.assets.length));

    const creditCheck = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } });
    if (!creditCheck || creditCheck.credits < assetCount) {
      return NextResponse.json(
        { error: `Not enough credits. You have ${creditCheck?.credits ?? 0}; need ${assetCount} for this campaign.` },
        { status: 402 }
      );
    }

    const orchestratorBrand = toOrchestratorBrand(brandRow);
    let logoUrl: string | null = null;
    try {
      const logos = brandRow.logos ? (typeof brandRow.logos === "string" ? JSON.parse(brandRow.logos) : brandRow.logos) : [];
      if (Array.isArray(logos) && logos[0]) logoUrl = String(logos[0]);
    } catch {
      // ignore
    }

    const isBrandLockEnabled = !!(brandRow as { isBrandLockEnabled?: boolean }).isBrandLockEnabled;
    const designConstraints = parseDesignConstraints((brandRow as { designConstraints?: string | null }).designConstraints);
    let campaignMemoryHint: string | null = null;
    try {
      const memory = await getCampaignMemory(brandRow.id);
      if (memory.assetCount > 0) {
        const recent = [memory.objectives.slice(0, 3).join(", "), memory.messagingFrameworks.slice(0, 3).join(", ")].filter(Boolean);
        if (recent.length) campaignMemoryHint = `Recent: ${recent.join("; ")}. Prefer variety when appropriate.`;
      }
    } catch {
      // ignore
    }

    // 2. Execute campaign (sequential orchestrator calls)
    const executed = await executeCampaign(orchestratorBrand, plan, {
      logoImageUrl: logoUrl,
      sessionIdPrefix: "campaign",
      isBrandLockEnabled,
      designConstraints,
      campaignMemoryHint,
    });

    // Only persist assets that have an imageUrl
    const successful = executed.filter((e) => e.imageUrl);
    if (successful.length === 0) {
      return NextResponse.json(
        { error: "Campaign generation produced no images. Check Replicate token and try again." },
        { status: 500 }
      );
    }

    // 3. Create Campaign and Assets, deduct credits
    const campaign = await prisma.$transaction(async (tx) => {
      const camp = await tx.campaign.create({
        data: {
          userId: user.id,
          brandId: brandRow.id,
          title: plan.campaignTitle,
          goal,
          strategySummary: plan.strategySummary,
          consistencyScore: null,
          objective: strategyBlueprint.marketingObjective ?? null,
          targetPersona: strategyBlueprint.targetPersona ?? null,
        },
      });

      const hasReplicate = !!(process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();
      for (const a of successful) {
        await tx.asset.create({
          data: {
            userId: user.id,
            brandId: brandRow.id,
            campaignId: camp.id,
            url: a.imageUrl!,
            label: a.label,
            type: a.type,
            width: a.width,
            height: a.height,
            prompt: a.finalPrompt,
            aspectRatio: a.blueprint.aspectRatio,
            model: hasReplicate ? "replicate/flux" : "emergent-backend",
            sourceIdea: a.label,
            blueprint: JSON.stringify(a.blueprint),
            finalPrompt: a.finalPrompt,
            ideaType: a.ideaType,
            objective: a.campaignStrategy?.objective ?? null,
            messagingFramework: a.campaignStrategy?.messagingFramework ?? null,
            emotionalTone: a.campaignStrategy?.emotionalTone ?? null,
          },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: { credits: { decrement: successful.length } },
      });

      return camp;
    });

    // 4. Evaluate consistency and update campaign
    const assetsForEval = successful.map((a) => ({
      label: a.label,
      ideaType: a.ideaType,
      finalPrompt: a.finalPrompt,
    }));
    const brandForEval = {
      name: brandRow.name,
      tagline: brandRow.tagline ?? undefined,
      description: brandRow.description ?? undefined,
      tone: brandRow.tone ?? undefined,
      personality: brandRow.personality ?? undefined,
      aestheticNarrative: brandForPlanner.aestheticNarrative,
      colors: orchestratorBrand.colors,
    };
    const consistency = await evaluateConsistency(assetsForEval, brandForEval);

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { consistencyScore: consistency.overallScore },
    });

    // 5. Return full campaign with assets
    const campaignWithAssets = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        assets: {
          select: { id: true, url: true, label: true, type: true, width: true, height: true, ideaType: true, createdAt: true },
        },
        brand: { select: { id: true, name: true, domain: true } },
      },
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } });

    return NextResponse.json({
      campaign: campaignWithAssets
        ? {
            ...campaignWithAssets,
            consistencyScore: consistency.overallScore,
            consistencyDetails: {
              colorConsistency: consistency.colorConsistency,
              toneConsistency: consistency.toneConsistency,
              visualConsistency: consistency.visualConsistency,
              recommendations: consistency.recommendations,
            },
          }
        : null,
      credits: updatedUser?.credits ?? 0,
    });
  } catch (e) {
    console.error("generate-campaign error:", e);
    return NextResponse.json({ error: "Campaign generation failed." }, { status: 500 });
  }
}

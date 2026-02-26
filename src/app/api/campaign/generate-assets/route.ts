import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { brandRowToIntelligence, brandIntelligenceColors, brandIntelligenceFonts, brandIntelligencePersonalityString } from "@/lib/brand-intelligence";
import { parseDesignConstraints } from "@/lib/strategy/constraintValidator";
import { getCampaignMemory } from "@/lib/strategy/campaignMemory";
import { runGenerationPipeline } from "@/lib/generation/orchestrator";
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

function ideaTypeToAssetType(ideaType: string): "social" | "ad" | "thumbnail" | "banner" {
  if (/ad|display|social_media_ad/.test(ideaType)) return "ad";
  if (/thumbnail|youtube_thumbnail/.test(ideaType)) return "thumbnail";
  if (/banner|cover|header|channel_art/.test(ideaType)) return "banner";
  return "social";
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId } = body as { campaignId?: string };
    if (!campaignId || typeof campaignId !== "string") {
      return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: user.id },
      include: {
        assets: { where: { status: "pending" }, orderBy: { createdAt: "asc" } },
        brand: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found or access denied." }, { status: 404 });
    }
    if (campaign.status === "generating") {
      return NextResponse.json(
        { error: "Campaign assets are already being generated." },
        { status: 409 }
      );
    }
    if (campaign.status === "complete") {
      return NextResponse.json(
        { error: "Campaign assets have already been generated." },
        { status: 409 }
      );
    }
    const pending = campaign.assets;
    if (pending.length === 0) {
      return NextResponse.json({ error: "No pending assets to generate." }, { status: 400 });
    }

    const creditCheck = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } });
    if (!creditCheck || creditCheck.credits < pending.length) {
      return NextResponse.json(
        { error: `Not enough credits. You have ${creditCheck?.credits ?? 0}; need ${pending.length}.` },
        { status: 402 }
      );
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "generating" },
    });

    const brandRow = campaign.brand as Parameters<typeof brandRowToIntelligence>[0] & { logos?: string | null; strategyProfile?: string | null };
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

    const hasReplicate = !!(process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();
    const sessionPrefix = `campaign-assets-${campaignId}-${Date.now()}`;

    for (let i = 0; i < pending.length; i++) {
      const asset = pending[i];
      let userPrompt = "";
      try {
        const bp = asset.blueprint ? (JSON.parse(asset.blueprint) as Record<string, unknown>) : {};
        userPrompt = (bp.purpose as string) ?? (bp.headlineConcept as string) ?? asset.label ?? "";
      } catch {
        userPrompt = asset.label ?? "";
      }

      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: "generating" },
      });

      const result = await runGenerationPipeline({
        brand: orchestratorBrand,
        ideaType: asset.ideaType ?? "linkedin_post",
        userPrompt: userPrompt.slice(0, 500),
        brandLock: false,
        logoImageUrl: logoUrl,
        sessionId: `${sessionPrefix}-${i}`,
        isBrandLockEnabled,
        designConstraints: designConstraints ?? undefined,
        campaignMemoryHint: campaignMemoryHint ?? undefined,
      });

      const imageUrl = result.imageUrl ?? "";
      const label = result.blueprint.intent?.headline?.slice(0, 40) || asset.label || "Asset";
      const type = ideaTypeToAssetType(result.ideaType);

      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          url: imageUrl,
          status: "complete",
          label: label.slice(0, 200),
          type,
          width: result.width,
          height: result.height,
          prompt: result.finalPrompt,
          aspectRatio: result.blueprint.aspectRatio,
          model: hasReplicate ? "replicate/flux" : "emergent-backend",
          finalPrompt: result.finalPrompt,
          blueprint: JSON.stringify(result.blueprint),
          objective: result.campaignStrategy?.objective ?? null,
          messagingFramework: result.campaignStrategy?.messagingFramework ?? null,
          emotionalTone: result.campaignStrategy?.emotionalTone ?? null,
        },
      });
    }

    await prisma.$transaction([
      prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "complete" },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: pending.length } },
      }),
    ]);

    const updated = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        goal: true,
        strategySummary: true,
        assetPlanSnapshot: true,
        assets: { orderBy: { createdAt: "asc" }, select: { id: true, url: true, label: true, type: true, width: true, height: true, ideaType: true, createdAt: true } },
        brand: { select: { id: true, name: true, domain: true } },
      },
    });
    const refreshedCredits = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } });

    return NextResponse.json({
      campaign: updated,
      credits: refreshedCredits?.credits ?? 0,
    });
  } catch (e) {
    console.error("[campaign/generate-assets] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Asset generation failed." },
      { status: 500 }
    );
  }
}

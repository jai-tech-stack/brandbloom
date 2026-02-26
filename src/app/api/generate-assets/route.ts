import path from "path";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { runGenerationPipeline, runRegenerationFromBlueprint } from "@/lib/generation/orchestrator";
import type { OrchestratorBrand } from "@/lib/generation/orchestrator";
import type { Blueprint } from "@/lib/generation/blueprintFactory";
import { brandRowToIntelligence, brandIntelligenceColors, brandIntelligenceFonts, brandIntelligencePersonalityString } from "@/lib/brand-intelligence";
import { getCampaignMemory } from "@/lib/strategy/campaignMemory";
import { parseDesignConstraints } from "@/lib/strategy/constraintValidator";

function ensureEnv() {
  const token = (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();
  if (token) return;
  try {
    const { config } = require("dotenv");
    config({ path: path.join(process.cwd(), ".env") });
  } catch {
    // dotenv not available
  }
}
ensureEnv();

export type GeneratedAsset = {
  id: string;
  url: string;
  label: string;
  type: "social" | "ad" | "thumbnail" | "banner";
  width: number;
  height: number;
};

type BrandInput = {
  name?: string;
  colors?: string[];
  description?: string;
  tagline?: string;
  fonts?: string[];
  logos?: string[];
  socialAccounts?: string[];
  personality?: string;
  tone?: string;
  visualStyleSummary?: string;
  aestheticNarrative?: string;
  strategyProfile?: Record<string, unknown> | null;
};

/** Shape of Brand row when loading by brandId (includes strategyProfile). */
type BrandForGenerate = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  colors: string;
  fonts: string | null;
  logos: string | null;
  personality: string | null;
  tone: string | null;
  visualStyle?: string | null;
  deepAnalysis: string | null;
  strategyProfile: string | null;
};

/** Shape of Asset row when loading for regeneration (includes blueprint + brand). */
type AssetForRegen = {
  blueprint: string | null;
  brandId: string | null;
  label: string;
  type: string;
  sourceIdea: string | null;
  brandSnapshot: string | null;
  brand: { name: string; tagline: string | null; description: string | null; colors: string; fonts: string | null; logos: string | null; personality: string | null; tone: string | null } | null;
};

/** Map ideaType slug to Asset.type */
function ideaTypeToAssetType(ideaType: string): "social" | "ad" | "thumbnail" | "banner" {
  if (/ad|display|social_media_ad/.test(ideaType)) return "ad";
  if (/thumbnail|youtube_thumbnail/.test(ideaType)) return "thumbnail";
  if (/banner|cover|header|channel_art/.test(ideaType)) return "banner";
  return "social";
}

/** Build orchestrator brand from body or DB row */
function toOrchestratorBrand(b: BrandInput | null): OrchestratorBrand | null {
  if (!b || (!b.name && !(b.colors?.length))) return null;
  return {
    name: b.name,
    tagline: b.tagline ?? undefined,
    description: b.description ?? undefined,
    colors: b.colors,
    fonts: b.fonts,
    personality: b.personality ?? undefined,
    tone: b.tone ?? undefined,
    aestheticNarrative: b.aestheticNarrative ?? undefined,
    visualStyleSummary: b.visualStyleSummary ?? undefined,
    logos: b.logos,
    strategyProfile: b.strategyProfile ?? undefined,
  };
}

/**
 * Asset generation API — uses 5-layer pipeline only (orchestrator).
 * Body: url (optional if brandId set), brand (optional), brandId, ideaType, promptOverride, aspectRatio, limit.
 */
export async function POST(request: NextRequest) {
  // #region agent log
  fetch("http://127.0.0.1:7926/ingest/90767cbc-7ef4-42c1-8d35-81a50ac82a6f", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dd0430" }, body: JSON.stringify({ sessionId: "dd0430", runId: "run1", hypothesisId: "C", location: "generate-assets/route.ts:POST", message: "generate-assets entry", data: {}, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  try {
    const body = await request.json();
    const {
      url,
      brand: brandBody,
      brandId,
      ideaType: ideaTypeParam,
      promptOverride,
      aspectRatio: _aspectRatioParam,
      limit: limitParam,
      regenerateFromAssetId,
      intentOverrides,
    } = body as {
      url?: string;
      brand?: BrandInput;
      brandId?: string;
      ideaType?: string;
      promptOverride?: string;
      aspectRatio?: string;
      limit?: number;
      regenerateFromAssetId?: string;
      intentOverrides?: Partial<{ headline: string; subtext: string; cta: string; visualDirection: string; toneAdjustment: string }>;
    };

    const user = await resolveAuthUser(request);
    const userId = user?.id ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in required to generate assets." },
        { status: 401 }
      );
    }

    // Regeneration path: use existing blueprint, modify intent, re-run prompt + execute only
    if (regenerateFromAssetId && typeof regenerateFromAssetId === "string") {
      const existing = (await prisma.asset.findFirst({
        where: { id: regenerateFromAssetId, userId },
        include: { brand: true },
      })) as AssetForRegen | null;
      if (!existing) {
        return NextResponse.json({ error: "Asset not found or access denied." }, { status: 404 });
      }
      const blueprintJson = existing.blueprint;
      if (!blueprintJson) {
        return NextResponse.json({ error: "Asset has no blueprint; cannot regenerate." }, { status: 400 });
      }
      let blueprint: Blueprint;
      try {
        blueprint = JSON.parse(blueprintJson) as Blueprint;
      } catch {
        return NextResponse.json({ error: "Invalid blueprint stored." }, { status: 400 });
      }
      const regenBrand = existing.brand
        ? (() => {
            const bi = brandRowToIntelligence(existing.brand as Parameters<typeof brandRowToIntelligence>[0]);
            return toOrchestratorBrand({
              name: existing.brand.name,
              tagline: existing.brand.tagline ?? undefined,
              description: existing.brand.description ?? undefined,
              colors: brandIntelligenceColors(bi),
              fonts: brandIntelligenceFonts(bi).length ? brandIntelligenceFonts(bi) : undefined,
              logos: existing.brand.logos ? (typeof existing.brand.logos === "string" ? JSON.parse(existing.brand.logos) : existing.brand.logos) : undefined,
              personality: brandIntelligencePersonalityString(bi) ?? undefined,
              tone: bi.toneOfVoice ?? undefined,
              visualStyleSummary: bi.visualStyle ?? undefined,
            });
          })()
        : toOrchestratorBrand(brandBody ?? null);
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (!u || u.credits < 1) {
        return NextResponse.json({ error: "Not enough credits to regenerate." }, { status: 402 });
      }
      const result = await runRegenerationFromBlueprint({
        blueprint,
        brand: regenBrand,
        intentOverrides,
        sessionId: `brandbloom-regen-${Date.now()}`,
      });
      if (!result.imageUrl) {
        return NextResponse.json({ error: "Regeneration produced no image." }, { status: 500 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.asset.create({
          data: {
            userId,
            brandId: existing.brandId,
            url: result.imageUrl!,
            label: blueprint.intent?.headline?.slice(0, 40) || existing.label,
            type: existing.type,
            width: result.width,
            height: result.height,
            prompt: result.finalPrompt,
            aspectRatio: blueprint.aspectRatio,
            model: (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim() ? "replicate/flux" : "emergent-backend",
            sourceIdea: existing.sourceIdea,
            brandSnapshot: existing.brandSnapshot,
            blueprint: JSON.stringify(result.blueprint),
            finalPrompt: result.finalPrompt,
            ideaType: blueprint.ideaType,
            backgroundUrl: result.backgroundUrl ?? null,
            finalImageUrl: result.finalImageUrl ?? null,
            objective: result.campaignStrategy?.objective ?? null,
            messagingFramework: result.campaignStrategy?.messagingFramework ?? null,
            emotionalTone: result.campaignStrategy?.emotionalTone ?? null,
          } as Prisma.AssetUncheckedCreateInput,
        });
        await tx.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } });
        return tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
      });
      return NextResponse.json({
        assets: [{
          id: "1",
          url: result.imageUrl,
          label: blueprint.intent?.headline?.slice(0, 40) || "Regenerated",
          type: existing.type,
          width: result.width,
          height: result.height,
        }],
        credits: updated?.credits ?? 0,
      });
    }

    // Resolve brand: from DB by brandId or from body
    let brandData: BrandInput | null = null;
    let ownedBrandId: string | null = null;
    let isBrandLockEnabled = false;
    let designConstraints: ReturnType<typeof parseDesignConstraints> = null;

    if (brandId) {
      const owned = await prisma.brand.findFirst({
        where: { id: brandId, userId },
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
          deepAnalysis: true,
          strategyProfile: true,
          isBrandLockEnabled: true,
          designConstraints: true,
        } as Prisma.BrandSelect,
      });
      if (!owned) {
        return NextResponse.json({ error: "Invalid brand selection for this user." }, { status: 403 });
      }
      ownedBrandId = owned.id;
      let strategy: Record<string, unknown> | null = null;
      try {
        if (owned.strategyProfile) strategy = JSON.parse(owned.strategyProfile as string) as Record<string, unknown>;
      } catch {
        // ignore
      }
      const bi = brandRowToIntelligence(owned as Parameters<typeof brandRowToIntelligence>[0]);
      brandData = {
        name: owned.name,
        tagline: owned.tagline ?? undefined,
        description: owned.description ?? undefined,
        colors: brandIntelligenceColors(bi),
        fonts: brandIntelligenceFonts(bi).length ? brandIntelligenceFonts(bi) : undefined,
        logos: owned.logos ? (typeof owned.logos === "string" ? JSON.parse(owned.logos) : owned.logos) : undefined,
        personality: brandIntelligencePersonalityString(bi) ?? undefined,
        tone: bi.toneOfVoice ?? undefined,
        visualStyleSummary: bi.visualStyle ?? undefined,
        strategyProfile: strategy ?? undefined,
      };
      isBrandLockEnabled = !!(owned as { isBrandLockEnabled?: boolean }).isBrandLockEnabled;
      designConstraints = parseDesignConstraints((owned as { designConstraints?: string | null }).designConstraints);
    }

    if (!brandData && brandBody && (brandBody.name || (brandBody.colors && brandBody.colors.length))) {
      brandData = brandBody;
      if (brandId) ownedBrandId = brandId;
    }

    // Require either url (legacy) or brand data
    if (!url && !brandData) {
      return NextResponse.json({ error: "Missing url or brand (or brandId)." }, { status: 400 });
    }

    const ideaType = (typeof ideaTypeParam === "string" && ideaTypeParam.trim()) ? ideaTypeParam.trim() : "custom";
    const userPrompt = typeof promptOverride === "string" ? promptOverride.trim() : "";
    const numToGenerate = Math.min(4, Math.max(1, Number(limitParam) || 1));

    // Credits check
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u || u.credits < numToGenerate) {
      return NextResponse.json(
        { error: `Not enough credits. You have ${u?.credits ?? 0}; need ${numToGenerate}.` },
        { status: 402 }
      );
    }

    const orchestratorBrand = toOrchestratorBrand(brandData);
    const sessionId = `brandbloom-${Date.now()}`;
    const logoUrl = (brandData?.logos && Array.isArray(brandData.logos) && brandData.logos[0]) ? String(brandData.logos[0]) : null;

    let campaignMemoryHint: string | null = null;
    if (ownedBrandId) {
      try {
        const memory = await getCampaignMemory(ownedBrandId);
        if (memory.assetCount > 0) {
          const recent = [
            memory.objectives.slice(0, 3).join(", "),
            memory.messagingFrameworks.slice(0, 3).join(", "),
          ].filter(Boolean);
          if (recent.length) campaignMemoryHint = `Recent: ${recent.join("; ")}. Prefer variety when appropriate.`;
        }
      } catch {
        // ignore
      }
    }

    const assets: GeneratedAsset[] = [];
    const generationMeta: Array<{
      blueprint: Record<string, unknown>;
      finalPrompt: string;
      ideaType: string;
      width: number;
      height: number;
      type: "social" | "ad" | "thumbnail" | "banner";
      label: string;
      backgroundUrl?: string | null;
      finalImageUrl?: string | null;
      campaignStrategy?: { objective: string | null; messagingFramework: string | null; emotionalTone: string | null };
    }> = [];

    for (let i = 0; i < numToGenerate; i++) {
      const result = await runGenerationPipeline({
        brand: orchestratorBrand,
        ideaType: i === 0 ? ideaType : "custom",
        userPrompt: i === 0 ? userPrompt : "",
        brandLock: false,
        logoImageUrl: logoUrl,
        sessionId: `${sessionId}-${i}`,
        isBrandLockEnabled,
        designConstraints: designConstraints ?? undefined,
        campaignMemoryHint: campaignMemoryHint ?? undefined,
      });

      const imageUrl = result.imageUrl;
      if (imageUrl) {
        const assetType = ideaTypeToAssetType(result.ideaType);
        const label = result.blueprint.intent?.headline?.slice(0, 40) || result.ideaType.replace(/_/g, " ") || "Asset";
        assets.push({
          id: String(assets.length + 1),
          url: imageUrl,
          label,
          type: assetType,
          width: result.width,
          height: result.height,
        });
        generationMeta.push({
          blueprint: result.blueprint as unknown as Record<string, unknown>,
          finalPrompt: result.finalPrompt,
          ideaType: result.ideaType,
          width: result.width,
          height: result.height,
          type: assetType,
          label,
          backgroundUrl: result.backgroundUrl ?? undefined,
          finalImageUrl: result.finalImageUrl ?? undefined,
          campaignStrategy: result.campaignStrategy,
        });
      }
    }

    if (assets.length > 0 && userId) {
      const hasReplicate = !!(process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();
      const updated = await prisma.$transaction(async (tx) => {
        for (let i = 0; i < assets.length; i++) {
          const a = assets[i];
          const m = generationMeta[i];
          await tx.asset.create({
            data: {
              userId,
              brandId: ownedBrandId,
              url: a.url,
              label: a.label,
              type: a.type,
              width: a.width,
              height: a.height,
              prompt: m?.finalPrompt ?? null,
              aspectRatio: m?.blueprint?.aspectRatio ? String(m.blueprint.aspectRatio) : null,
              model: hasReplicate ? "replicate/flux" : "emergent-backend",
              sourceIdea: m?.label ?? null,
              brandSnapshot: brandData ? JSON.stringify(brandData) : null,
              blueprint: JSON.stringify(m?.blueprint ?? {}),
              finalPrompt: m?.finalPrompt ?? null,
              ideaType: m?.ideaType ?? null,
              backgroundUrl: m?.backgroundUrl ?? null,
              finalImageUrl: m?.finalImageUrl ?? null,
              objective: m?.campaignStrategy?.objective ?? null,
              messagingFramework: m?.campaignStrategy?.messagingFramework ?? null,
              emotionalTone: m?.campaignStrategy?.emotionalTone ?? null,
            } as Prisma.AssetUncheckedCreateInput,
          });
        }
        await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: assets.length } },
        });
        return tx.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });
      });
      return NextResponse.json({ assets, credits: updated?.credits ?? 0 });
    }

    if (assets.length > 0) return NextResponse.json({ assets });

    // Demo fallback when no image URL returned
    const demoLabel = ideaType.replace(/_/g, " ") || "Custom";
    const demoAssets: GeneratedAsset[] = [{
      id: "1",
      url: `https://placehold.co/1024x1024/1c1917/ea751d?text=${encodeURIComponent(demoLabel)}`,
      label: demoLabel,
      type: "social",
      width: 1024,
      height: 1024,
    }];
    return NextResponse.json({ assets: demoAssets, demo: true });
  } catch (e) {
    // #region agent log
    fetch("http://127.0.0.1:7926/ingest/90767cbc-7ef4-42c1-8d35-81a50ac82a6f", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dd0430" }, body: JSON.stringify({ sessionId: "dd0430", runId: "run1", hypothesisId: "C", location: "generate-assets/route.ts catch", message: "generate-assets error", data: { error: String(e), name: (e as Error)?.name }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    console.error("generate-assets error:", e);
    return NextResponse.json({ error: "Asset generation failed" }, { status: 500 });
  }
}

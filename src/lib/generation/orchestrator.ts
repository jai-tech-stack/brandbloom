/**
 * Orchestrator — single entry point for asset generation.
 * New architecture: blueprint → generateBackground() → renderLayout() → overlayText() → placeLogo() → exportComposite().
 * Image model never renders text. All typography and logo placement are programmatic.
 */

import { createBlueprint } from "./blueprintFactory";
import { buildImagePrompt, buildBackgroundOnlyPrompt } from "./promptBuilder";
import { executeImageGeneration } from "./imageExecutor";
import { generateBackground } from "@/lib/render/backgroundGenerator";
import { renderComposite } from "@/lib/render/compositeRenderer";
import { uploadBufferToStorage } from "@/server/services/storage";
import { generateCampaignBlueprint, campaignBlueprintToStrategyFields } from "@/lib/strategy/campaignAgent";
import { validateBlueprint, parseDesignConstraints, applyConstraintsToBrandAssets } from "@/lib/strategy/constraintValidator";
import type { DesignConstraints } from "@/lib/strategy/constraintValidator";
import type { BrandForIntent } from "./intentInterpreter";
import type { BrandForPrompt } from "./promptBuilder";
import type { Blueprint } from "./blueprintFactory";
import type { IntentOutput } from "./intentInterpreter";

export type OrchestratorBrand = BrandForIntent & BrandForPrompt & { logos?: string[] };

export type OrchestratorInput = {
  brand: OrchestratorBrand | null;
  ideaType: string;
  userPrompt: string;
  brandLock?: boolean;
  /** Optional logo URL for reference (e.g. first logo from brand) */
  logoImageUrl?: string | null;
  sessionId?: string;
  /** If set, use this headline instead of campaign agent headline (strategy fields still from agent) */
  headlineOverride?: string | null;
  /** Enterprise Brand Lock: only enforce when true */
  isBrandLockEnabled?: boolean;
  /** Enterprise Brand Lock: design constraints (from Brand.designConstraints) */
  designConstraints?: DesignConstraints | string | null;
  /** Campaign memory: hint to encourage variety (e.g. "Recent campaigns used AIDA; prefer different framework.") */
  campaignMemoryHint?: string | null;
};

export type CampaignStrategySnapshot = {
  objective: string | null;
  messagingFramework: string | null;
  emotionalTone: string | null;
};

export type OrchestratorResult = {
  /** Main image URL to show and store (composite if deterministic, else raw model output) */
  imageUrl: string | null;
  /** AI-generated background only (no text/logos). Set when using deterministic flow. */
  backgroundUrl?: string | null;
  /** Deterministic composite: background + layout + text + logo. Set when export succeeds. */
  finalImageUrl?: string | null;
  blueprint: Blueprint;
  finalPrompt: string;
  width: number;
  height: number;
  ideaType: string;
  /** Strategy output for campaign memory (persist on Asset) */
  campaignStrategy?: CampaignStrategySnapshot;
};

const USE_DETERMINISTIC_LAYOUT = process.env.USE_DETERMINISTIC_LAYOUT !== "false";

/**
 * Run the full pipeline for one asset.
 * Deterministic (default): blueprint → background-only image → layout overlay → composite URL.
 * Legacy: blueprint → full prompt (text in image) → single image.
 */
export async function runGenerationPipeline(input: OrchestratorInput): Promise<OrchestratorResult> {
  const {
    brand,
    ideaType,
    userPrompt,
    brandLock = false,
    logoImageUrl,
    sessionId,
    headlineOverride,
    isBrandLockEnabled = false,
    designConstraints: designConstraintsRaw,
    campaignMemoryHint,
  } = input;
  const sid = sessionId ?? `bb-${Date.now()}`;
  const designConstraints = parseDesignConstraints(designConstraintsRaw);
  const effectiveLock = isBrandLockEnabled && !!designConstraints;

  const userIntentWithMemory = campaignMemoryHint?.trim()
    ? `${userPrompt.trim()}\n\nCampaign memory: ${campaignMemoryHint.trim().slice(0, 300)}`
    : userPrompt;

  // 1. Campaign Strategist Agent (AI CMO) — strategy layer before render
  const campaignBlueprint = await generateCampaignBlueprint({
    brand: brand ? {
      name: brand.name,
      tagline: brand.tagline,
      description: brand.description,
      personality: brand.personality,
      tone: brand.tone,
      visualStyleSummary: brand.visualStyleSummary,
      targetAudience: (brand as { targetAudience?: string }).targetAudience,
      colors: brand.colors,
    } : null,
    userIntent: userIntentWithMemory,
    assetType: ideaType,
  });

  const headline = (headlineOverride?.trim() && headlineOverride.trim().length > 0)
    ? headlineOverride.trim().slice(0, 120)
    : campaignBlueprint.headline;

  const intent: IntentOutput = {
    headline,
    subtext: campaignBlueprint.subtext,
    cta: campaignBlueprint.cta,
    visualDirection: campaignBlueprint.visualDirection,
    toneAdjustment: campaignBlueprint.emotionalTone,
  };

  const campaignStrategy = campaignBlueprintToStrategyFields(campaignBlueprint);

  // 2. Blueprint (existing factory; render engine unchanged)
  let blueprint = createBlueprint(ideaType, intent);

  // 3. Brand Lock: validate and auto-adjust blueprint before render (no render logic change)
  blueprint = validateBlueprint(blueprint, designConstraints, effectiveLock);

  const brandForRender = brand && effectiveLock && designConstraints
    ? {
        ...brand,
        colors: applyConstraintsToBrandAssets(
          brand.colors ?? [],
          brand.fonts,
          designConstraints,
          true
        ).colors,
        fonts: applyConstraintsToBrandAssets(
          brand.colors ?? [],
          brand.fonts,
          designConstraints,
          true
        ).fonts,
      }
    : brand;

  if (USE_DETERMINISTIC_LAYOUT) {
    // 1. generateBackground() — AI background only, no text, no logos
    const backgroundUrl = await generateBackground({
      blueprint,
      brand: brandForRender,
      brandLock: brandLock || effectiveLock,
      sessionId: sid,
    });
    if (!backgroundUrl) {
      return {
        imageUrl: null,
        backgroundUrl: null,
        finalImageUrl: null,
        blueprint,
        finalPrompt: "",
        width: blueprint.width,
        height: blueprint.height,
        ideaType: blueprint.ideaType,
      };
    }

    // 2. renderLayout() + overlayText() + placeLogo() + exportComposite()
    const pngBuffer = await renderComposite({
      backgroundUrl,
      blueprint,
      brand: brandForRender ? { colors: brandForRender.colors, fonts: brandForRender.fonts } : null,
      logoUrl: blueprint.includeLogo ? logoImageUrl ?? undefined : undefined,
    });

    let finalImageUrl: string | null = null;
    if (pngBuffer) {
      const key = `composites/${sid}-${Date.now()}.png`;
      finalImageUrl = await uploadBufferToStorage(pngBuffer, key, "image/png");
    }
    const imageUrl = finalImageUrl ?? backgroundUrl;
    const bgPrompt = buildBackgroundOnlyPrompt(blueprint, brand, { brandLock });

    return {
      imageUrl,
      backgroundUrl,
      finalImageUrl: finalImageUrl ?? backgroundUrl,
      blueprint,
      finalPrompt: bgPrompt,
      width: blueprint.width,
      height: blueprint.height,
      ideaType: blueprint.ideaType,
      campaignStrategy,
    };
  }

  // Legacy: single prompt with text/layout in image
  const finalPrompt = buildImagePrompt(blueprint, brandForRender ?? brand, { brandLock: brandLock || effectiveLock });
  const imageUrl = await executeImageGeneration(finalPrompt, blueprint, {
    logoImageUrl,
    sessionId: sid,
  });

  return {
    imageUrl,
    blueprint,
    finalPrompt,
    width: blueprint.width,
    height: blueprint.height,
    ideaType: blueprint.ideaType,
    campaignStrategy,
  };
}

export type RegenerationInput = {
  /** Existing blueprint (e.g. from Asset.blueprint). Modifications applied on top. */
  blueprint: Blueprint;
  brand: OrchestratorBrand | null;
  brandLock?: boolean;
  logoImageUrl?: string | null;
  sessionId?: string;
  /** Optional intent overrides (headline, subtext, cta, etc.) — merge into blueprint.intent */
  intentOverrides?: Partial<Blueprint["intent"]>;
};

/**
 * Regenerate from an existing blueprint. Modifies blueprint fields (e.g. intent), does NOT rebuild from raw prompt.
 * When deterministic: background-only → layout → export. Else: full prompt → execute.
 */
export async function runRegenerationFromBlueprint(input: RegenerationInput): Promise<OrchestratorResult> {
  const { blueprint: baseBlueprint, brand, brandLock = false, logoImageUrl, sessionId, intentOverrides } = input;
  const intent = { ...baseBlueprint.intent, ...intentOverrides };
  const blueprint: Blueprint = { ...baseBlueprint, intent };
  const sid = sessionId ?? `bb-regen-${Date.now()}`;

  if (USE_DETERMINISTIC_LAYOUT) {
    const backgroundUrl = await generateBackground({
      blueprint,
      brand,
      brandLock,
      sessionId: sid,
    });
    if (!backgroundUrl) {
      const bgPrompt = buildBackgroundOnlyPrompt(blueprint, brand, { brandLock });
      return {
        imageUrl: null,
        backgroundUrl: null,
        finalImageUrl: null,
        blueprint,
        finalPrompt: bgPrompt,
        width: blueprint.width,
        height: blueprint.height,
        ideaType: blueprint.ideaType,
      };
    }
    const pngBuffer = await renderComposite({
      backgroundUrl,
      blueprint,
      brand: brand ? { colors: brand.colors, fonts: brand.fonts } : null,
      logoUrl: blueprint.includeLogo ? logoImageUrl ?? undefined : undefined,
    });
    let finalImageUrl: string | null = null;
    if (pngBuffer) {
      const key = `composites/${sid}-${Date.now()}.png`;
      finalImageUrl = await uploadBufferToStorage(pngBuffer, key, "image/png");
    }
    const imageUrl = finalImageUrl ?? backgroundUrl;
    const bgPrompt = buildBackgroundOnlyPrompt(blueprint, brand, { brandLock });
    return {
      imageUrl,
      backgroundUrl,
      finalImageUrl: finalImageUrl ?? backgroundUrl,
      blueprint,
      finalPrompt: bgPrompt,
      width: blueprint.width,
      height: blueprint.height,
      ideaType: blueprint.ideaType,
    };
  }

  const finalPrompt = buildImagePrompt(blueprint, brand, { brandLock });
  const imageUrl = await executeImageGeneration(finalPrompt, blueprint, { logoImageUrl, sessionId: sid });
  return {
    imageUrl,
    blueprint,
    finalPrompt,
    width: blueprint.width,
    height: blueprint.height,
    ideaType: blueprint.ideaType,
  };
}

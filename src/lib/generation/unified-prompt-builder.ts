import { buildBackgroundOnlyPrompt, type BrandForPrompt } from "@/lib/generation/promptBuilder";
import { interpretIntent } from "@/lib/generation/intentInterpreter";
import { createBlueprint } from "@/lib/generation/blueprintFactory";

export type BuildPromptBrandInput = {
  name?: string;
  tagline?: string;
  description?: string;
  colors?: string[];
  fonts?: string[];
  personality?: string;
  tone?: string;
  visualStyleSummary?: string;
  aestheticNarrative?: string;
  logos?: string[];
};

export type BuildPromptContext = {
  assetType: string;
  dimension: string;
  userOverride?: string;
  photoMode?: boolean;
};

/**
 * Unified prompt builder used across free generation, campaigns, and photo flows.
 */
export async function buildPrompt(
  brand: BuildPromptBrandInput,
  context: BuildPromptContext,
  _usePythonAgent = false
): Promise<string> {
  const interpreted = await interpretIntent(
    brand,
    context.assetType,
    context.userOverride?.trim() || context.assetType
  );

  const blueprint = createBlueprint(context.assetType, interpreted);
  const promptBrand: BrandForPrompt = {
    ...brand,
    colors: brand.colors ?? [],
    fonts: brand.fonts ?? [],
    logos: brand.logos ?? [],
  };

  const basePrompt = buildBackgroundOnlyPrompt(blueprint, promptBrand, {
    logoOverlay: context.photoMode ?? false,
  });

  if (!context.photoMode) {
    return basePrompt;
  }

  return `${basePrompt} Preserve realistic composition for photo transformation while maintaining brand visual identity.`;
}

/**
 * Legacy compatibility wrapper for existing free generation code paths.
 */
export async function buildFallbackPrompt(
  brand: BuildPromptBrandInput,
  prompt: string,
  width: number,
  height: number
): Promise<string> {
  return buildPrompt(brand, {
    assetType: "social",
    dimension: `${width}x${height}`,
    userOverride: prompt,
  });
}

/**
 * Legacy compatibility wrapper for upload/photo branding route.
 */
export async function buildPhotoPrompt(
  brand: BuildPromptBrandInput,
  userPrompt: string,
  width: number,
  height: number
): Promise<string> {
  return buildPrompt(brand, {
    assetType: "social",
    dimension: `${width}x${height}`,
    userOverride: userPrompt,
    photoMode: true,
  });
}

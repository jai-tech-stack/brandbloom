/**
 * Prompt Builder Layer
 * Builds a deterministic, layout-enforced image prompt. Never logo-only.
 */

import type { Blueprint } from "./blueprintFactory";

export type BrandForPrompt = {
  name?: string;
  tagline?: string;
  description?: string;
  colors?: string[];
  fonts?: string[];
  personality?: string;
  tone?: string;
  aestheticNarrative?: string;
  visualStyleSummary?: string;
  logos?: string[];
  /** From deep strategy; use positioning, archetype, contentPillars in prompt */
  strategyProfile?: {
    positioning?: { differentiation?: string; category?: string };
    brandArchetype?: string;
    visualDNA?: { style?: string; designDensity?: string; colorEnergy?: string };
    contentPillars?: string[];
  } | null;
};

/**
 * Build image generation prompt. STRICT: no headline, subtext, CTA, or logo placement.
 * AI must never render typography. All text is rendered by the Canvas layout engine.
 * This function now returns a background-only prompt (same semantics as buildBackgroundOnlyPrompt).
 */
export function buildImagePrompt(
  blueprint: Blueprint,
  brand: BrandForPrompt | null,
  options?: { brandLock?: boolean }
): string {
  return buildBackgroundOnlyPrompt(blueprint, brand, options);
}

// --- Background-only prompt (no text, no logos, no layout) ---

const BACKGROUND_ONLY_PREFIX =
  "Generate abstract professional marketing background. No text. No typography. No logos. No letters. Designed for text overlay. ";

/**
 * Build a prompt that asks the image model ONLY for a background.
 * Use this for the deterministic flow: AI = background art, app = layout engine.
 */
export function buildBackgroundOnlyPrompt(
  blueprint: Blueprint,
  brand: BrandForPrompt | null,
  _options?: { brandLock?: boolean }
): string {
  const parts: string[] = [BACKGROUND_ONLY_PREFIX];

  parts.push(`Visual direction: ${blueprint.intent.visualDirection}.`);
  parts.push(`Tone and mood: ${blueprint.intent.toneAdjustment}.`);
  parts.push(`Aspect ratio: ${blueprint.aspectRatio}. Full-bleed background, no text or logos.`);

  if (brand?.colors?.length) {
    parts.push(`Use these brand colors in the background: ${brand.colors.slice(0, 5).join(", ")}.`);
  }
  if (brand?.aestheticNarrative) {
    parts.push(`Style: ${brand.aestheticNarrative.slice(0, 200)}.`);
  } else if (brand?.visualStyleSummary) {
    parts.push(`Visual style: ${brand.visualStyleSummary.slice(0, 120)}.`);
  }
  if (brand?.personality || brand?.tone) {
    const t = [brand.personality, brand.tone].filter(Boolean).join(", ");
    if (t) parts.push(`Aesthetic: ${t.slice(0, 80)}.`);
  }

  parts.push("High quality, professional, 4K. Background only.");
  return parts.join(" ");
}

/**
 * Background Generator — AI generates background visuals only.
 * No text. No logos. Designed for overlay.
 * Strict: image model must never render text.
 */

import { buildBackgroundOnlyPrompt } from "@/lib/generation/promptBuilder";
import { executeImageGeneration } from "@/lib/generation/imageExecutor";
import type { Blueprint } from "@/lib/generation/blueprintFactory";
import type { BrandForPrompt } from "@/lib/generation/promptBuilder";

export type GenerateBackgroundInput = {
  /** Blueprint with visualDirection, aspectRatio, dimensions */
  blueprint: Blueprint;
  /** Brand colors, style, tone (for background mood only) */
  brand: BrandForPrompt | null;
  brandLock?: boolean;
  /** When true, prompt steers toward logo-overlay-friendly, on-brand background (e.g. logo-based campaigns) */
  logoOverlay?: boolean;
  sessionId?: string;
};

/**
 * Generate background-only image from blueprint and brand.
 * Prompt rules: background only, no text, no logos, designed for overlay, professional.
 * Returns URL of the generated background image, or null on failure.
 */
export async function generateBackground(
  input: GenerateBackgroundInput
): Promise<string | null> {
  const { blueprint, brand, brandLock = false, logoOverlay = false, sessionId } = input;
  const prompt = buildBackgroundOnlyPrompt(blueprint, brand, { brandLock, logoOverlay });
  return executeImageGeneration(prompt, blueprint, {
    logoImageUrl: null,
    sessionId: sessionId ?? `bg-${Date.now()}`,
  });
}

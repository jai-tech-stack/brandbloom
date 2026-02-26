/**
 * Deterministic layout engine: blueprint + background → HTML with text/logo overlay.
 * No AI here: fixed margins, grid, font sizes. App = layout engine.
 */

import type { LayoutInput, LayoutTemplateResult } from "./types";
import { renderTopHeading } from "./topHeading";

const LAYOUT_MAP: Record<string, (input: LayoutInput) => LayoutTemplateResult> = {
  "top-heading": renderTopHeading,
  "centered-vertical": renderTopHeading, // reuse; can add variant later
  "split-text-product": renderTopHeading,
  "banner-wide": renderTopHeading,
  "quote-block": renderTopHeading,
  "bold-center": renderTopHeading,
  "vertical-story": renderTopHeading,
  "thumbnail-cta": renderTopHeading,
  "product-hero": renderTopHeading,
  default: renderTopHeading,
};

/**
 * Render layout HTML for a given blueprint + background. Deterministic.
 */
export function renderLayout(input: LayoutInput): LayoutTemplateResult {
  const fn = LAYOUT_MAP[input.layout] ?? LAYOUT_MAP.default;
  return fn(input);
}

export type { LayoutInput, LayoutTemplateResult };

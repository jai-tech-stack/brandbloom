/**
 * Layout engine types — deterministic placement of text and logo.
 * No AI: fixed margins, grid, font sizes, safe zones.
 */

export type LayoutInput = {
  width: number;
  height: number;
  /** Background image URL (AI-generated, no text) */
  backgroundUrl: string;
  headline: string;
  subtext?: string | null;
  cta?: string | null;
  /** Logo image URL (optional) */
  logoUrl?: string | null;
  /** Brand hex colors for text/CTA [primary, secondary, ...] */
  brandColors?: string[];
  /** Layout key: top-heading, centered-vertical, split-text-product, etc. */
  layout: string;
};

export type LayoutTemplateResult = {
  html: string;
  /** Used for export dimensions */
  width: number;
  height: number;
};

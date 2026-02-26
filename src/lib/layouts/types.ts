/**
 * Layout system types — deterministic only. No AI.
 * Margin, grid, font sizes, text alignment, CTA style, logo position.
 */

export type LayoutProps = {
  width: number;
  height: number;
  /** Background image URL (AI-generated, no text) */
  backgroundUrl: string;
  headline: string;
  subtext?: string | null;
  cta?: string | null;
  logoUrl?: string | null;
  /** Brand hex colors [primary, accent, ...] */
  brandColors?: string[];
  /** Font family names for headline and body */
  fontFamily?: string;
  fontFamilyHeadline?: string;
  /** Layout key to select template (e.g. top-heading, split-text-product) */
  layout?: string;
};

export type LayoutKey =
  | "squareTopHeading"
  | "splitLeftText"
  | "verticalStoryCentered"
  | "productHero"
  | "top-heading"
  | "centered-vertical"
  | "split-text-product"
  | "banner-wide"
  | "quote-block"
  | "bold-center"
  | "vertical-story"
  | "product-hero"
  | "center-product";

/**
 * Blueprint Factory Layer
 * Converts ideaType into real layout structure and merges with intent.
 */

import type { IntentOutput } from "./intentInterpreter";

export type LayoutConfig = {
  aspectRatio: string;
  layout: string;
  includeLogo: boolean;
  compositionBehavior?: string;
};

export type Blueprint = {
  ideaType: string;
  aspectRatio: string;
  layout: string;
  includeLogo: boolean;
  compositionBehavior?: string;
  intent: IntentOutput;
  /** Resolved width/height for the image executor */
  width: number;
  height: number;
};

/** Normalize idea label (e.g. "LinkedIn Post") or slug to canonical slug */
export function toIdeaTypeSlug(labelOrSlug: string): string {
  const s = String(labelOrSlug).trim().toLowerCase().replace(/\s*\/\s*/g, "_").replace(/\s+/g, "_");
  if (!s) return "custom";
  return s;
}

const LAYOUT_MAP: Record<string, LayoutConfig> = {
  linkedin_post: { aspectRatio: "1:1", layout: "top-heading", includeLogo: true, compositionBehavior: "headline-above-visual" },
  instagram_story: { aspectRatio: "9:16", layout: "centered-vertical", includeLogo: true, compositionBehavior: "vertical-story" },
  instagram_post: { aspectRatio: "1:1", layout: "top-heading", includeLogo: true },
  twitter_post: { aspectRatio: "1:1", layout: "top-heading", includeLogo: true },
  "twitter/x_post": { aspectRatio: "1:1", layout: "top-heading", includeLogo: true },
  youtube_thumbnail: { aspectRatio: "16:9", layout: "bold-center", includeLogo: false, compositionBehavior: "thumbnail-cta" },
  facebook_post: { aspectRatio: "1:1", layout: "top-heading", includeLogo: true },
  pinterest_pin: { aspectRatio: "2:3", layout: "centered-vertical", includeLogo: true, compositionBehavior: "vertical-pin" },
  product_launch: { aspectRatio: "1:1", layout: "split-text-product", includeLogo: true, compositionBehavior: "product-hero" },
  event_invite: { aspectRatio: "1:1", layout: "centered-vertical", includeLogo: true },
  celebrate_achievements: { aspectRatio: "1:1", layout: "top-heading", includeLogo: true },
  attract_talent: { aspectRatio: "1:1", layout: "top-heading", includeLogo: true },
  blog_hero_image: { aspectRatio: "16:9", layout: "top-heading", includeLogo: false },
  newsletter: { aspectRatio: "16:9", layout: "top-heading", includeLogo: true },
  ebook_guide_cover: { aspectRatio: "2:3", layout: "centered-vertical", includeLogo: false },
  display_ad: { aspectRatio: "4:3", layout: "split-text-product", includeLogo: true },
  social_media_ad: { aspectRatio: "1:1", layout: "top-heading", includeLogo: true },
  customer_testimonial: { aspectRatio: "1:1", layout: "quote-block", includeLogo: true },
  thought_leadership: { aspectRatio: "1:1", layout: "quote-block", includeLogo: true },
  team_spotlight: { aspectRatio: "1:1", layout: "centered-vertical", includeLogo: true },
  inspirational_quote: { aspectRatio: "1:1", layout: "quote-block", includeLogo: false },
  linkedin_banner: { aspectRatio: "4:1", layout: "banner-wide", includeLogo: true },
  twitter_header: { aspectRatio: "3:1", layout: "banner-wide", includeLogo: true },
  "twitter/x_header": { aspectRatio: "3:1", layout: "banner-wide", includeLogo: true },
  youtube_channel_art: { aspectRatio: "16:9", layout: "banner-wide", includeLogo: true },
  facebook_cover: { aspectRatio: "2.7:1", layout: "banner-wide", includeLogo: true },
  hero_product_shot: { aspectRatio: "1:1", layout: "center-product", includeLogo: false, compositionBehavior: "product-focus" },
  lifestyle_shot: { aspectRatio: "4:5", layout: "lifestyle-scene", includeLogo: false },
  catalog_layout: { aspectRatio: "1:1", layout: "grid-products", includeLogo: true },
  streetwear_hoodie: { aspectRatio: "1:1", layout: "mockup-product", includeLogo: true },
  minimalist_tee: { aspectRatio: "1:1", layout: "mockup-product", includeLogo: true },
  tote_bag: { aspectRatio: "1:1", layout: "mockup-product", includeLogo: true },
  cap_hat: { aspectRatio: "1:1", layout: "mockup-product", includeLogo: true },
  custom: { aspectRatio: "1:1", layout: "top-heading", includeLogo: true },
};

/** Map aspect ratio string to width/height (approximate for Replicate). */
function aspectToDimensions(aspectRatio: string): { width: number; height: number } {
  const map: Record<string, [number, number]> = {
    "1:1": [1024, 1024],
    "9:16": [576, 1024],
    "16:9": [1344, 768],
    "4:3": [1152, 896],
    "3:4": [768, 1024],
    "2:3": [682, 1024],
    "4:5": [819, 1024],
    "3:2": [1152, 768],
    "5:4": [1024, 819],
    "4:1": [1344, 336],
    "3:1": [1200, 400],
    "2.7:1": [1344, 498],
    "21:9": [1344, 576],
  };
  const pair = map[aspectRatio] ?? [1024, 1024];
  return { width: pair[0], height: pair[1] };
}

/**
 * Create blueprint from ideaType and intent.
 * ideaType can be slug (linkedin_post) or label (LinkedIn Post).
 */
export function createBlueprint(ideaType: string, intent: IntentOutput): Blueprint {
  const slug = toIdeaTypeSlug(ideaType);
  const config = LAYOUT_MAP[slug] ?? LAYOUT_MAP.custom;
  const { width, height } = aspectToDimensions(config.aspectRatio);
  return {
    ideaType: slug,
    aspectRatio: config.aspectRatio,
    layout: config.layout,
    includeLogo: config.includeLogo,
    compositionBehavior: config.compositionBehavior,
    intent,
    width,
    height,
  };
}

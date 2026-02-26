/**
 * Unified Brand Intelligence — single structure produced by all input sources
 * (URL, logo, future manual). Maps into canonical BrandIntelligence for DB/generation.
 */

import type { BrandIntelligence } from "./brand-intelligence";

export type UnifiedBrandIntelligence = {
  brandName: string;
  colors: string[];
  fonts: { heading: string; body: string };
  personality: string[];
  toneOfVoice: string;
  industry: string;
  visualStyle: string;
  targetAudience: string;
  tagline: string;
  mission: string;
  vision: string;
  brandStory: string;
};

/** Default empty-ish unified intelligence for fallbacks */
export const EMPTY_UNIFIED: UnifiedBrandIntelligence = {
  brandName: "",
  colors: [],
  fonts: { heading: "", body: "" },
  personality: [],
  toneOfVoice: "",
  industry: "",
  visualStyle: "",
  targetAudience: "",
  tagline: "",
  mission: "",
  vision: "",
  brandStory: "",
};

/** Limit string length for DB storage */
function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
}

/**
 * Map URL extraction result (BrandData from extract-brand) to UnifiedBrandIntelligence.
 * Does not modify the original route logic; only shapes output for storage.
 */
export function fromUrlBrandData(data: {
  name: string;
  description?: string;
  tagline?: string;
  colors: string[];
  fonts?: string[];
  personality?: string;
  tone?: string;
  targetAudience?: string;
  visualStyleSummary?: string;
  values?: string[];
  keyMessages?: string[];
  toneKeywords?: string[];
  aestheticNarrative?: string;
}): UnifiedBrandIntelligence {
  const fonts = data.fonts ?? [];
  return {
    brandName: str(data.name, 120) || "Brand",
    colors: (data.colors ?? []).slice(0, 6),
    fonts: {
      heading: fonts[0] ?? "",
      body: fonts[1] ?? fonts[0] ?? "",
    },
    personality: data.personality
      ? data.personality.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6)
      : (data.values ?? []).slice(0, 6),
    toneOfVoice: str(data.tone, 200),
    industry: "",
    visualStyle: str(data.visualStyleSummary ?? data.aestheticNarrative, 300),
    targetAudience: str(data.targetAudience, 200),
    tagline: str(data.tagline, 200),
    mission: str(data.description, 500),
    vision: "",
    brandStory: str(data.description, 500),
  };
}

/**
 * Map logo vision result (LogoBrandIntelligence) to UnifiedBrandIntelligence.
 */
export function fromLogoIntelligence(logo: {
  brandName: string;
  primaryColor: string;
  secondaryColors: string[];
  suggestedFonts: { heading: string; body: string };
  brandPersonality: string[];
  toneOfVoice: string;
  industryGuess: string;
  visualStyle: string;
  targetAudienceGuess: string;
  taglineSuggestions: string[];
  brandStory: string;
  mission: string;
  vision: string;
}): UnifiedBrandIntelligence {
  const colors = [
    logo.primaryColor?.trim() ? logo.primaryColor : "#111111",
    ...(logo.secondaryColors ?? []).filter(Boolean),
  ].slice(0, 6);
  return {
    brandName: str(logo.brandName, 120) || "My Brand",
    colors,
    fonts: {
      heading: str(logo.suggestedFonts?.heading, 80),
      body: str(logo.suggestedFonts?.body, 80) || str(logo.suggestedFonts?.heading, 80),
    },
    personality: arr(logo.brandPersonality).slice(0, 6),
    toneOfVoice: str(logo.toneOfVoice, 200),
    industry: str(logo.industryGuess, 100),
    visualStyle: str(logo.visualStyle, 300),
    targetAudience: str(logo.targetAudienceGuess, 200),
    tagline: str(logo.taglineSuggestions?.[0], 200),
    mission: str(logo.mission, 300),
    vision: str(logo.vision, 300),
    brandStory: str(logo.brandStory, 500),
  };
}

/** Convert UnifiedBrandIntelligence → canonical BrandIntelligence for DB and generation */
export function unifiedToBrandIntelligence(
  unified: UnifiedBrandIntelligence,
  sourceType: "url" | "logo" | "manual" | "hybrid",
  logoUrl: string | null = null
): BrandIntelligence {
  const primary = unified.colors[0] ?? null;
  const secondary = unified.colors.slice(1, 6);
  return {
    brandName: unified.brandName || "Brand",
    sourceType,
    logoUrl,
    primaryColor: primary || null,
    secondaryColors: secondary,
    headingFont: unified.fonts.heading || null,
    bodyFont: unified.fonts.body || null,
    toneOfVoice: unified.toneOfVoice || null,
    personalityTraits: unified.personality.slice(0, 6),
    industry: unified.industry || null,
    targetAudience: unified.targetAudience || null,
    visualStyle: unified.visualStyle || null,
    brandArchetype: null,
    tagline: unified.tagline || null,
    mission: unified.mission || null,
    vision: unified.vision || null,
    brandStory: unified.brandStory || null,
  };
}

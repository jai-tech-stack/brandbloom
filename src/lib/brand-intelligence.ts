/**
 * BrandIntelligence — canonical object for every brand (URL, Logo, Manual, Hybrid).
 * This is the moat: one structure for extraction, strategy, and generation.
 * Generation uses only: primaryColor, secondaryColors, headingFont, bodyFont,
 * toneOfVoice, visualStyle, personalityTraits. No source branching.
 */

export type BrandIntelligence = {
  brandName: string;
  sourceType: "url" | "logo" | "manual" | "hybrid";
  logoUrl: string | null;

  primaryColor: string | null;
  secondaryColors: string[];

  headingFont: string | null;
  bodyFont: string | null;

  toneOfVoice: string | null;
  personalityTraits: string[];

  industry: string | null;
  targetAudience: string | null;

  visualStyle: string | null;
  brandArchetype: string | null;

  tagline: string | null;
  mission: string | null;
  vision: string | null;
  brandStory: string | null;
};

export const EMPTY_BRAND_INTELLIGENCE: BrandIntelligence = {
  brandName: "",
  sourceType: "url",
  logoUrl: null,
  primaryColor: null,
  secondaryColors: [],
  headingFont: null,
  bodyFont: null,
  toneOfVoice: null,
  personalityTraits: [],
  industry: null,
  targetAudience: null,
  visualStyle: null,
  brandArchetype: null,
  tagline: null,
  mission: null,
  vision: null,
  brandStory: null,
};

/** Colors array for generation (primary + secondary, max 6) */
export function brandIntelligenceColors(bi: BrandIntelligence): string[] {
  const out: string[] = [];
  if (bi.primaryColor) out.push(bi.primaryColor);
  out.push(...bi.secondaryColors);
  return out.slice(0, 6);
}

/** Fonts array [heading, body] for layout/generation */
export function brandIntelligenceFonts(bi: BrandIntelligence): string[] {
  const h = bi.headingFont ?? bi.bodyFont ?? "";
  const b = bi.bodyFont ?? bi.headingFont ?? "";
  return [h, b].filter(Boolean);
}

/** Personality string for prompts (comma-separated) */
export function brandIntelligencePersonalityString(bi: BrandIntelligence): string | null {
  if (!bi.personalityTraits?.length) return null;
  return bi.personalityTraits.slice(0, 6).join(", ");
}

/** Parse JSON array from DB string */
export function parseJsonStringArray(s: string | null | undefined): string[] {
  if (!s || typeof s !== "string") return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

/** Convert Prisma Brand row to BrandIntelligence (prefer canonical fields, fallback to legacy) */
export function brandRowToIntelligence(row: {
  name: string;
  sourceType?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColors?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  toneOfVoice?: string | null;
  personalityTraits?: string | null;
  industry?: string | null;
  targetAudience?: string | null;
  visualStyle?: string | null;
  brandArchetype?: string | null;
  tagline?: string | null;
  mission?: string | null;
  vision?: string | null;
  brandStory?: string | null;
  // legacy
  colors?: string | null;
  fonts?: string | null;
  personality?: string | null;
  tone?: string | null;
  description?: string | null;
  deepAnalysis?: string | null;
}): BrandIntelligence {
  const colorsLegacy = parseJsonStringArray(row.colors);
  const fontsLegacy = parseJsonStringArray(row.fonts);
  const personalityLegacy = row.personality
    ? row.personality.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6)
    : [];

  let deep: Record<string, unknown> | null = null;
  if (row.deepAnalysis) {
    try {
      deep = JSON.parse(row.deepAnalysis) as Record<string, unknown>;
    } catch {
      // ignore
    }
  }

  const primaryColor = row.primaryColor ?? (colorsLegacy[0] || null);
  const secondaryColors = row.secondaryColors != null
    ? parseJsonStringArray(row.secondaryColors)
    : colorsLegacy.slice(1, 6);
  const headingFont = row.headingFont ?? fontsLegacy[0] ?? null;
  const bodyFont = row.bodyFont ?? fontsLegacy[1] ?? fontsLegacy[0] ?? null;
  const personalityTraits = row.personalityTraits != null
    ? parseJsonStringArray(row.personalityTraits)
    : personalityLegacy;
  const toneOfVoice = row.toneOfVoice ?? row.tone ?? null;
  const targetAudience = row.targetAudience ?? (deep?.targetAudience as string) ?? (deep?.targetAudienceGuess as string) ?? null;
  const visualStyle = row.visualStyle ?? (deep?.visualStyle as string) ?? (deep?.visualStyleSummary as string) ?? null;
  const brandArchetype = row.brandArchetype ?? (deep?.brandArchetype as string) ?? null;
  const mission = row.mission ?? (deep?.mission as string) ?? null;
  const vision = row.vision ?? (deep?.vision as string) ?? null;
  const brandStory = row.brandStory ?? (deep?.brandStory as string) ?? null;
  const industry = row.industry ?? (deep?.industry as string) ?? (deep?.industryGuess as string) ?? null;

  const sourceType = (row.sourceType === "url" || row.sourceType === "logo" || row.sourceType === "manual" || row.sourceType === "hybrid")
    ? row.sourceType
    : "url";

  return {
    brandName: row.name || "",
    sourceType,
    logoUrl: row.logoUrl ?? null,
    primaryColor: primaryColor || null,
    secondaryColors: secondaryColors.slice(0, 5),
    headingFont: headingFont || null,
    bodyFont: bodyFont || null,
    toneOfVoice: toneOfVoice || null,
    personalityTraits: personalityTraits.slice(0, 6),
    industry: industry || null,
    targetAudience: targetAudience || null,
    visualStyle: visualStyle || null,
    brandArchetype: brandArchetype || null,
    tagline: row.tagline ?? null,
    mission: mission || null,
    vision: vision || null,
    brandStory: brandStory || null,
  };
}

/** Build Prisma create/update data from BrandIntelligence (canonical + legacy for compat) */
export function brandIntelligenceToPrismaData(bi: BrandIntelligence): {
  name: string;
  sourceType: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColors: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  toneOfVoice: string | null;
  personalityTraits: string | null;
  industry: string | null;
  targetAudience: string | null;
  visualStyle: string | null;
  brandArchetype: string | null;
  tagline: string | null;
  mission: string | null;
  vision: string | null;
  brandStory: string | null;
  colors: string;
  fonts: string | null;
  personality: string | null;
  tone: string | null;
} {
  const colors = brandIntelligenceColors(bi);
  const fonts = brandIntelligenceFonts(bi);
  const personalityStr = brandIntelligencePersonalityString(bi);
  return {
    name: bi.brandName || "Brand",
    sourceType: bi.sourceType,
    logoUrl: bi.logoUrl,
    primaryColor: bi.primaryColor,
    secondaryColors: bi.secondaryColors.length ? JSON.stringify(bi.secondaryColors) : null,
    headingFont: bi.headingFont,
    bodyFont: bi.bodyFont,
    toneOfVoice: bi.toneOfVoice,
    personalityTraits: bi.personalityTraits.length ? JSON.stringify(bi.personalityTraits) : null,
    industry: bi.industry,
    targetAudience: bi.targetAudience,
    visualStyle: bi.visualStyle,
    brandArchetype: bi.brandArchetype,
    tagline: bi.tagline,
    mission: bi.mission,
    vision: bi.vision,
    brandStory: bi.brandStory,
    colors: JSON.stringify(colors.length ? colors : ["#111111"]),
    fonts: fonts.length ? JSON.stringify(fonts) : null,
    personality: personalityStr,
    tone: bi.toneOfVoice,
  };
}

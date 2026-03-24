import { scrapeBrandFromUrl } from "@/lib/brand-scraper";
import { analyzeLogoWithVision } from "@/lib/logo-brand-analysis";

export type UnifiedAnalyzeInput = {
  method: "url" | "logo";
  urlHref?: string;
  logoBase64?: string;
  logoMimeType?: string;
  brandName?: string;
  additionalContext?: {
    tone?: string;
    industry?: string;
    audience?: string;
  };
};

export type UnifiedBrandIntelligence = {
  name: string;
  description: string;
  tagline: string;
  colors: string[];
  fonts: string[];
  logos: string[];
  personality?: string;
  tone?: string;
  targetAudience?: string;
  industry?: string;
  aestheticNarrative?: string;
  sourceType: "url" | "logo";
};

function toHex(color: string): string | null {
  const s = color.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
    }
    return `#${hex}`.toLowerCase();
  }
  return null;
}

function normalizeColors(colors: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const color of colors) {
    const hex = toHex(color);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
    if (out.length >= 8) break;
  }
  return out;
}

/**
 * Main unified extraction entrypoint used by consolidated brand creation route.
 */
export async function analyzeBrand(input: UnifiedAnalyzeInput): Promise<UnifiedBrandIntelligence> {
  if (input.method === "url") {
    if (!input.urlHref) {
      throw new Error("urlHref is required for URL analysis.");
    }
    const scraped = await scrapeBrandFromUrl(input.urlHref);
    const scrapedWithOptional = scraped as typeof scraped & {
      personality?: string;
      tone?: string;
    };

    return {
      name: scraped.name,
      description: scraped.description || "",
      tagline: scraped.tagline || "",
      colors: normalizeColors(scraped.colors || []),
      fonts: (scraped.fonts || []).slice(0, 5),
      logos: (scraped.logos || []).slice(0, 5),
      personality: scrapedWithOptional.personality,
      tone: scrapedWithOptional.tone || input.additionalContext?.tone,
      targetAudience: input.additionalContext?.audience,
      industry: input.additionalContext?.industry,
      aestheticNarrative: scraped.description || undefined,
      sourceType: "url",
    };
  }

  if (!input.logoBase64) {
    throw new Error("logoBase64 is required for logo analysis.");
  }

  const mimeType = input.logoMimeType || "image/png";
  const logoDataUrl = `data:${mimeType};base64,${input.logoBase64}`;
  const logoIntelligence = await analyzeLogoWithVision(logoDataUrl);

  return {
    name: input.brandName || logoIntelligence.brandName || "Untitled Brand",
    description: logoIntelligence.brandStory || "",
    tagline: logoIntelligence.taglineSuggestions[0] || "",
    colors: normalizeColors([logoIntelligence.primaryColor, ...logoIntelligence.secondaryColors]),
    fonts: [logoIntelligence.suggestedFonts.heading, logoIntelligence.suggestedFonts.body].filter(Boolean).slice(0, 5),
    logos: [],
    personality: logoIntelligence.brandPersonality.join(", "),
    tone: input.additionalContext?.tone || logoIntelligence.toneOfVoice,
    targetAudience: input.additionalContext?.audience || logoIntelligence.targetAudienceGuess,
    industry: input.additionalContext?.industry || logoIntelligence.industryGuess,
    aestheticNarrative: logoIntelligence.visualStyle,
    sourceType: "logo",
  };
}

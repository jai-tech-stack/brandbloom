import { scrapeBrandFromUrl } from "@/lib/brand-scraper";
import { analyzeLogoWithVision } from "@/lib/logo-brand-analysis";

export type UnifiedAnalyzeInput = {
  method: "url" | "logo" | "instagram";
  urlHref?: string;
  logoBase64?: string;
  logoMimeType?: string;
  brandName?: string;
  instagramHandle?: string;
  instagramUrl?: string;
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
  sourceType: "url" | "logo" | "instagram";
};

function forceHttps(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed.startsWith("http://") ? `https://${trimmed.slice(7)}` : trimmed;
}

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

async function analyzeInstagramProfile(input: UnifiedAnalyzeInput): Promise<UnifiedBrandIntelligence> {
  const handle = (input.instagramHandle || "").replace(/^@/, "").trim();
  const profileUrl =
    input.instagramUrl?.trim() ||
    (handle ? `https://www.instagram.com/${handle}/` : "");

  if (!profileUrl) {
    throw new Error("instagramHandle or instagramUrl is required for Instagram analysis.");
  }

  const response = await fetch(profileUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BrandBloomBot/1.0)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Instagram profile fetch failed (${response.status}).`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

  const inferredName =
    input.brandName?.trim() ||
    titleMatch?.[1]?.replace(/\s*\(\s*@[^)]+\)\s*$/i, "").trim() ||
    handle ||
    "Instagram Brand";

  const description = descMatch?.[1]?.trim() || "";
  const logo = imageMatch?.[1]?.trim() || "";
  const personality: string[] = [];
  const lower = description.toLowerCase();
  if (/premium|luxury|exclusive/.test(lower)) personality.push("premium");
  if (/creative|design|art|studio/.test(lower)) personality.push("creative");
  if (/minimal|clean|simple/.test(lower)) personality.push("minimal");
  if (/bold|strong|powerful/.test(lower)) personality.push("bold");
  if (/friendly|community|family/.test(lower)) personality.push("approachable");

  return {
    name: inferredName,
    description,
    tagline: "",
    colors: [],
    fonts: [],
    logos: logo ? [forceHttps(logo)] : [],
    personality: personality.join(", ") || undefined,
    tone: input.additionalContext?.tone,
    targetAudience: input.additionalContext?.audience,
    industry: input.additionalContext?.industry,
    aestheticNarrative: description || undefined,
    sourceType: "instagram",
  };
}

/**
 * Main unified extraction entrypoint used by consolidated brand creation route.
 */
export async function analyzeBrand(input: UnifiedAnalyzeInput): Promise<UnifiedBrandIntelligence> {
  if (input.method === "instagram") {
    return analyzeInstagramProfile(input);
  }

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

import { NextRequest, NextResponse } from "next/server";
import { scrapeBrandFromUrl } from "@/lib/brand-scraper";

// Allow up to 60s so scrape + AI analysis can complete (Vercel Pro; Hobby limit is 10s)
export const maxDuration = 60;
import { analyzeBrandWithAI } from "@/lib/ai-brand-analysis";
import { deepBrandAnalysis } from "@/lib/deep-brand-analysis";
import { analyzeDeepStrategy } from "@/lib/brand/deepStrategyAnalysis";
import { fromUrlBrandData, unifiedToBrandIntelligence } from "@/lib/unified-brand-intelligence";
import { brandIntelligenceToPrismaData } from "@/lib/brand-intelligence";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";

export type BrandData = {
  name: string;
  description: string;
  tagline: string;
  colors: string[];
  image: string | null;
  siteUrl: string;
  domain: string;
  fonts: string[];
  logos: string[];
  socialAccounts?: string[];
  personality?: string;
  tone?: string;
  brandId?: string;
  /** Deep LLM analysis (Brand DNA). */
  values?: string[];
  targetAudience?: string;
  visualStyleSummary?: string;
  keyMessages?: string[];
  toneKeywords?: string[];
  aestheticNarrative?: string;
  /** Strategic profile (audience, positioning, archetype, toneSpectrum, visualDNA, messagingAngles, contentPillars). */
  strategyProfile?: Record<string, unknown>;
}

const BACKEND_BLOOM_URL = process.env.BACKEND_BLOOM_URL || "";

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_RE = /^\s*rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)\s*$/;

/** Normalize a single color to hex; return null if invalid. */
function toHex(color: string): string | null {
  const s = color.trim();
  if (!s) return null;
  if (HEX_RE.test(s)) {
    const hex = s.slice(1);
    if (hex.length === 3) return "#" + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return "#" + hex.slice(0, 6).toLowerCase();
  }
  const rgb = s.match(RGB_RE);
  if (rgb) {
    const r = Math.min(255, parseInt(rgb[1], 10));
    const g = Math.min(255, parseInt(rgb[2], 10));
    const b = Math.min(255, parseInt(rgb[3], 10));
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  return null;
}

/** Deduplicate and normalize colors to hex; max 6. */
function normalizeAndDedupeColors(colors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of colors) {
    const hex = toHex(c);
    if (hex && !seen.has(hex)) {
      seen.add(hex);
      out.push(hex);
      if (out.length >= 6) break;
    }
  }
  return out;
}

/** Luminance (0–1) from hex. */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Saturation (0–1) from hex; 0 = grey. */
function saturation(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/** Drop pure black/white; keep brand palette including dark text and light accent. */
function filterBrandColors(hexColors: string[]): string[] {
  const out: string[] = [];
  for (const hex of hexColors) {
    if (hex.length !== 7) continue;
    const L = luminance(hex);
    const S = saturation(hex);
    if (L <= 0.03 || L >= 0.99) continue; // skip only pure black/white
    if (L > 0.12 && L < 0.92 && S <= 0.06) continue; // skip mid neutral greys only
    out.push(hex);
  }
  const filtered = out.slice(0, 6);
  if (filtered.length === 0 && hexColors.length > 0) return hexColors.slice(0, 6);
  return filtered;
}

/** Map Brand BLOOM+ backend profile to existing BrandData shape */
function mapBloomProfileToBrandData(profile: Record<string, unknown>, url: string): BrandData {
  const primary = (profile.primary_colors as string[]) || [];
  const secondary = (profile.secondary_colors as string[]) || [];
  const rawColors = [...primary, ...secondary];
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0] || "website";
    }
  })();
  const name = domain.replace(/^www\./, "").split(".")[0] || domain;
  const style = (profile.style as string) || "";
  const mood = Array.isArray(profile.mood) ? (profile.mood as string[]).join(", ") : "";
  return {
    name,
    description: [style, mood].filter(Boolean).join(". ") || "Brand identity extracted from website.",
    tagline: (profile.logo_description as string) || style || "",
    colors: filterBrandColors(normalizeAndDedupeColors(rawColors)),
    image: (profile.logo_url as string) || null,
    siteUrl: url,
    domain,
    fonts: (profile.fonts as string[]) || [],
    logos: (profile.logo_url as string) ? [profile.logo_url as string] : [],
    socialAccounts: (profile.social_accounts as string[]) || [],
    personality: style || undefined,
    tone: mood || undefined,
  };
}

/**
 * Fetches the URL and extracts brand data (like Bloom).
 * If BACKEND_BLOOM_URL is set, uses the Brand BLOOM+ Python backend (Claude + CSS extraction).
 * Otherwise uses the Node scraper + AI.
 * If user is logged in, saves Brand to DB and returns brandId.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid url" },
        { status: 400 }
      );
    }

    const trimmed = url.trim();
    const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(href);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json(
          { error: "URL must use http or https" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Use a full URL (e.g. https://example.com)." },
        { status: 400 }
      );
    }

    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Sign in required to extract brand and create assets." },
        { status: 401 }
      );
    }

    let brand: BrandData;
    let pageTextExcerpt: string | undefined;
    let strategyProfileJson: string | null = null;

    if (BACKEND_BLOOM_URL) {
      try {
        const res = await fetch(`${BACKEND_BLOOM_URL.replace(/\/$/, "")}/api/brands/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: href }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string }).detail || res.statusText || "Backend error");
        }
        const profile = (await res.json()) as Record<string, unknown>;
        brand = mapBloomProfileToBrandData(profile, href);
      } catch (fetchErr) {
        console.error("extract-brand (BLOOM backend) error:", fetchErr);
        return NextResponse.json(
          { error: fetchErr instanceof Error ? fetchErr.message : "Brand BLOOM+ backend failed. Is it running?" },
          { status: 502 }
        );
      }
    } else {
      let scraped;
      try {
        scraped = await scrapeBrandFromUrl(href);
      } catch (fetchErr) {
        console.error("extract-brand fetch error:", fetchErr);
        return NextResponse.json(
          { error: "Could not fetch URL. Check that it is public and reachable." },
          { status: 422 }
        );
      }

      pageTextExcerpt = scraped.pageTextExcerpt;
      brand = {
        ...scraped,
        colors: filterBrandColors(normalizeAndDedupeColors(scraped.colors)),
        fonts: scraped.fonts ?? [],
        logos: scraped.logos ?? [],
        socialAccounts: scraped.socialAccounts ?? [],
      };

      try {
        const deepInput = {
          name: scraped.name,
          description: scraped.description,
          tagline: scraped.tagline,
          colors: brand.colors,
          fonts: scraped.fonts,
          pageTextExcerpt: scraped.pageTextExcerpt,
          metaKeywords: scraped.metaKeywords,
          jsonLd: scraped.jsonLd,
        };
        const strategyInput = {
          name: brand.name,
          description: brand.description,
          tagline: brand.tagline,
          colors: brand.colors,
          fonts: scraped.fonts,
          websiteScrapedText: pageTextExcerpt,
          aestheticNarrative: undefined as string | undefined,
          targetAudience: undefined as string | undefined,
          personality: undefined as string | undefined,
          tone: undefined as string | undefined,
          visualCues: [brand.colors?.length ? `Colors: ${brand.colors.slice(0, 6).join(", ")}` : ""].filter(Boolean).join("; "),
        };
        const [dna, strategyProfileResult] = await Promise.all([
          deepBrandAnalysis(deepInput).then((d) => d),
          analyzeDeepStrategy(strategyInput).catch(() => null),
        ]);
        if (dna && Object.keys(dna).length > 0) {
          if (dna.personality) brand.personality = dna.personality;
          if (dna.tone) brand.tone = dna.tone;
          if (dna.values?.length) brand.values = dna.values;
          if (dna.targetAudience) brand.targetAudience = dna.targetAudience;
          if (dna.visualStyleSummary) brand.visualStyleSummary = dna.visualStyleSummary;
          if (dna.keyMessages?.length) brand.keyMessages = dna.keyMessages;
          if (dna.toneKeywords?.length) brand.toneKeywords = dna.toneKeywords;
          if (dna.aestheticNarrative) brand.aestheticNarrative = dna.aestheticNarrative;
        } else {
          const analysis = await analyzeBrandWithAI({
            name: scraped.name,
            description: scraped.description,
            tagline: scraped.tagline,
            colors: scraped.colors,
          });
          if (analysis.personality) brand.personality = analysis.personality;
          if (analysis.tone) brand.tone = analysis.tone;
        }
        if (strategyProfileResult) {
          strategyProfileJson = JSON.stringify(strategyProfileResult);
          brand.strategyProfile = strategyProfileResult as unknown as Record<string, unknown>;
        }
      } catch {
        // Keep scraped data; personality/tone optional
      }
    }

    // Canonical Brand Intelligence (one structure for all sources)
    const unified = fromUrlBrandData({
      name: brand.name,
      description: brand.description,
      tagline: brand.tagline,
      colors: brand.colors,
      fonts: brand.fonts,
      personality: brand.personality,
      tone: brand.tone,
      targetAudience: brand.targetAudience,
      visualStyleSummary: brand.visualStyleSummary,
      values: brand.values,
      keyMessages: brand.keyMessages,
      toneKeywords: brand.toneKeywords,
      aestheticNarrative: brand.aestheticNarrative,
    });
    const bi = unifiedToBrandIntelligence(unified, "url", brand.image ?? null);
    const canonical = brandIntelligenceToPrismaData(bi);
    const deepAnalysisJson = JSON.stringify(unified);

    const saved = await prisma.brand.create({
      data: {
        userId: authUser.id,
        ...canonical,
        siteUrl: href,
        domain: brand.domain,
        image: brand.image,
        logos: JSON.stringify(brand.logos),
        socialAccounts: brand.socialAccounts?.length ? JSON.stringify(brand.socialAccounts) : null,
        deepAnalysis: deepAnalysisJson,
        strategyProfile: strategyProfileJson,
        source: "url",
        sourceType: "url",
      },
    });
    brand.brandId = saved.id;

    return NextResponse.json(brand);
  } catch (e) {
    console.error("extract-brand error:", e);
    const message = e instanceof Error ? e.message : "Brand extraction failed";
    const isTimeout = typeof message === "string" && /timeout|ETIMEDOUT|deadline/i.test(message);
    return NextResponse.json(
      { error: isTimeout ? "Analysis took too long. Please try again or use a simpler URL." : "Brand extraction failed. Please try again." },
      { status: 500 }
    );
  }
}

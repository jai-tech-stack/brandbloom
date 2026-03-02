import { NextRequest, NextResponse } from "next/server";
import { scrapeBrandFromUrl } from "@/lib/brand-scraper";

// Allow up to 60s on Vercel Pro; Hobby has 10s
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
  values?: string[];
  targetAudience?: string;
  visualStyleSummary?: string;
  keyMessages?: string[];
  toneKeywords?: string[];
  aestheticNarrative?: string;
  strategyProfile?: Record<string, unknown>;
  // Enhanced extraction fields
  metaDescription?: string;
  ogImage?: string;
  twitterHandle?: string;
  industry?: string;
  contentPillars?: string[];
};

const BACKEND_BLOOM_URL = process.env.BACKEND_BLOOM_URL || "";

// ─── Color utilities ──────────────────────────────────────────────────────────

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_RE = /^\s*rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*(?:,\s*[\d.]+)?\s*\)\s*$/;

function toHex(color: string): string | null {
  const s = color.trim();
  if (!s) return null;
  if (HEX_RE.test(s)) {
    const hex = s.slice(1);
    if (hex.length === 3)
      return "#" + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
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

function normalizeAndDedupeColors(colors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of colors) {
    const hex = toHex(c);
    if (hex && !seen.has(hex)) {
      seen.add(hex);
      out.push(hex);
      if (out.length >= 8) break;
    }
  }
  return out;
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturation(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/**
 * Filter out pure white/black/near-grey colors. Keep brand-representative colors.
 * Also preserves near-white/near-black if they're clearly intentional brand colors.
 */
function filterBrandColors(hexColors: string[]): string[] {
  const out: string[] = [];
  for (const hex of hexColors) {
    if (hex.length !== 7) continue;
    const L = luminance(hex);
    const S = saturation(hex);
    // Skip pure/near-pure white
    if (L >= 0.97) continue;
    // Skip pure/near-pure black (but allow very dark brand colors with some saturation)
    if (L <= 0.02 && S < 0.1) continue;
    // Skip mid-grey (no saturation)
    if (L > 0.08 && L < 0.95 && S <= 0.04) continue;
    out.push(hex);
  }
  const filtered = out.slice(0, 6);
  // Fallback: if we filtered everything, just return top 6 raw
  if (filtered.length === 0 && hexColors.length > 0) return hexColors.slice(0, 6);
  return filtered;
}

// ─── Enhanced scraping — supplement scrapeBrandFromUrl with additional signals ─

/**
 * Try to fetch the page and extract additional brand signals beyond what
 * scrapeBrandFromUrl gets — specifically: OG image, meta description,
 * Twitter handle, CSS variable colors, brand name from JSON-LD schema.
 */
async function extractAdditionalSignals(href: string): Promise<{
  ogImage: string | null;
  twitterHandle: string | null;
  metaDescription: string | null;
  schemaName: string | null;
  schemaDescription: string | null;
  cssVarColors: string[];
  inlineStyleColors: string[];
}> {
  try {
    const res = await fetch(href, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrandExtractor/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { ogImage: null, twitterHandle: null, metaDescription: null, schemaName: null, schemaDescription: null, cssVarColors: [], inlineStyleColors: [] };

    const html = await res.text();

    // OG image
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const ogImage = ogImageMatch?.[1] ?? null;

    // Twitter handle
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:site["'][^>]+content=["'](@[^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["'](@[^"']+)["'][^>]+name=["']twitter:site["']/i);
    const twitterHandle = twitterMatch?.[1] ?? null;

    // Meta description
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,400})["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']{10,400})["'][^>]+name=["']description["']/i);
    const metaDescription = descMatch?.[1]?.trim() ?? null;

    // JSON-LD schema name + description
    let schemaName: string | null = null;
    let schemaDescription: string | null = null;
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
    for (const block of jsonLdMatches) {
      try {
        const jsonStr = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
        const schema = JSON.parse(jsonStr) as Record<string, unknown>;
        if (!schemaName && schema.name && typeof schema.name === "string") schemaName = schema.name;
        if (!schemaDescription && schema.description && typeof schema.description === "string") schemaDescription = schema.description;
        if (schemaName && schemaDescription) break;
      } catch { /* ignore */ }
    }

    // CSS custom properties (--color-*, --primary, etc.)
    const cssVarColorMatches = html.match(/--[a-z-]*(color|primary|secondary|brand|accent|bg|background|text)[^:]*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/gi) ?? [];
    const cssVarColors: string[] = [];
    for (const match of cssVarColorMatches) {
      const colorMatch = match.match(/(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/);
      if (colorMatch) cssVarColors.push(colorMatch[1]);
    }

    // Inline style colors from prominent elements
    const inlineColors: string[] = [];
    const inlineMatches = html.match(/style=["'][^"']*(?:color|background)[^"']*["']/gi) ?? [];
    for (const match of inlineMatches.slice(0, 50)) {
      const colorMatches = match.match(/#[0-9a-fA-F]{3,6}/gi) ?? [];
      inlineColors.push(...colorMatches);
    }

    return {
      ogImage: ogImage ? (ogImage.startsWith("http") ? ogImage : new URL(ogImage, href).href) : null,
      twitterHandle,
      metaDescription,
      schemaName,
      schemaDescription,
      cssVarColors: cssVarColors.slice(0, 20),
      inlineStyleColors: inlineColors.slice(0, 30),
    };
  } catch {
    return { ogImage: null, twitterHandle: null, metaDescription: null, schemaName: null, schemaDescription: null, cssVarColors: [], inlineStyleColors: [] };
  }
}

// ─── BLOOM+ profile mapper ─────────────────────────────────────────────────────

function mapBloomProfileToBrandData(profile: Record<string, unknown>, url: string): BrandData {
  const primary = (profile.primary_colors as string[]) || [];
  const secondary = (profile.secondary_colors as string[]) || [];
  const rawColors = [...primary, ...secondary];
  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url.replace(/^https?:\/\//, "").split("/")[0] || "website"; }
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

// ─── AI / timeout helpers ─────────────────────────────────────────────────────

function hasAIKeys(): boolean {
  return !!(
    (process.env.OPENAI_API_KEY ?? "").trim() ||
    (process.env.ANTHROPIC_API_KEY ?? "").trim()
  );
}

async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T | null> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn(`[extract-brand] ${label} timed out after ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs)
      ),
    ]);
    return result;
  } catch (e) {
    console.warn(`[extract-brand] ${label} failed:`, (e as Error).message);
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { url?: string };
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
    }

    const trimmed = url.trim();
    const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

    try {
      const parsed = new URL(href);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "URL must use http or https" }, { status: 400 });
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Use a full URL like https://example.com" },
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

    // ─── BLOOM+ backend path ───────────────────────────────────────────────────
    if (BACKEND_BLOOM_URL) {
      try {
        const res = await fetch(
          `${BACKEND_BLOOM_URL.replace(/\/$/, "")}/api/brands/analyze`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: href }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string }).detail || res.statusText || "Backend error");
        }
        const profile = (await res.json()) as Record<string, unknown>;
        brand = mapBloomProfileToBrandData(profile, href);
      } catch (fetchErr) {
        console.error("extract-brand (BLOOM backend) error:", fetchErr);
        return NextResponse.json(
          { error: fetchErr instanceof Error ? fetchErr.message : "Brand BLOOM+ backend failed." },
          { status: 502 }
        );
      }
    } else {
      // ─── Node scraper path ────────────────────────────────────────────────────
      let scraped: Awaited<ReturnType<typeof scrapeBrandFromUrl>>;
      try {
        scraped = await withTimeout(
          () => scrapeBrandFromUrl(href),
          25000,
          "scrapeBrandFromUrl"
        ) as Awaited<ReturnType<typeof scrapeBrandFromUrl>>;

        if (!scraped) {
          return NextResponse.json(
            {
              error:
                "Could not fetch this URL within 25 seconds. The site may be blocking server requests (Cloudflare, login wall, etc.). Try your homepage URL or a simpler URL.",
            },
            { status: 422 }
          );
        }
      } catch (fetchErr) {
        console.error("extract-brand fetch error:", fetchErr);
        return NextResponse.json(
          { error: "Could not fetch URL. Check that it is public and reachable (no login required)." },
          { status: 422 }
        );
      }

      pageTextExcerpt = scraped.pageTextExcerpt;

      // ─── Enhanced signal extraction (parallel with scrape result) ──────────
      const additionalSignals = await withTimeout(
        () => extractAdditionalSignals(href),
        12000,
        "extractAdditionalSignals"
      );

      // Merge colors: scraper colors + CSS var colors + inline style colors
      const allRawColors = [
        ...(scraped.colors ?? []),
        ...(additionalSignals?.cssVarColors ?? []),
        ...(additionalSignals?.inlineStyleColors ?? []),
      ];
      const mergedColors = filterBrandColors(normalizeAndDedupeColors(allRawColors));

      // Better logo: prefer OG image if no logo found
      const bestLogo = scraped.image
        ?? scraped.logos?.[0]
        ?? additionalSignals?.ogImage
        ?? null;

      // Better name: prefer JSON-LD schema name over domain extraction
      const bestName = additionalSignals?.schemaName?.trim()
        ?? scraped.name?.trim()
        ?? "";

      // Better description: prefer JSON-LD schema, then meta description, then scraped
      const bestDescription = additionalSignals?.schemaDescription?.trim()
        ?? (additionalSignals?.metaDescription && additionalSignals.metaDescription.length > 30 ? additionalSignals.metaDescription.trim() : null)
        ?? scraped.description?.trim()
        ?? "";

      brand = {
        ...scraped,
        name: bestName || scraped.name,
        description: bestDescription || scraped.description,
        colors: mergedColors.length ? mergedColors : filterBrandColors(normalizeAndDedupeColors(scraped.colors ?? [])),
        image: bestLogo,
        fonts: scraped.fonts ?? [],
        logos: scraped.logos ?? (bestLogo ? [bestLogo] : []),
        socialAccounts: [
          ...(scraped.socialAccounts ?? []),
          ...(additionalSignals?.twitterHandle ? [additionalSignals.twitterHandle] : []),
        ].filter((v, i, a) => a.indexOf(v) === i), // dedupe
        metaDescription: additionalSignals?.metaDescription ?? undefined,
        ogImage: additionalSignals?.ogImage ?? undefined,
        twitterHandle: additionalSignals?.twitterHandle ?? undefined,
      };

      // ─── AI enrichment (only if keys are configured) ──────────────────────
      if (hasAIKeys()) {
        const deepInput = {
          name: brand.name,
          description: brand.description,
          tagline: brand.tagline,
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
          visualCues: brand.colors?.length ? `Colors: ${brand.colors.slice(0, 6).join(", ")}` : "",
        };

        // Run deep analysis + strategy in parallel with independent timeouts
        const [dna, strategyProfileResult] = await Promise.all([
          withTimeout(() => deepBrandAnalysis(deepInput), 20000, "deepBrandAnalysis"),
          withTimeout(() => analyzeDeepStrategy(strategyInput), 20000, "analyzeDeepStrategy"),
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
          // Fallback: simpler AI analysis
          const analysis = await withTimeout(
            () => analyzeBrandWithAI({
              name: scraped.name,
              description: brand.description,
              tagline: brand.tagline,
              colors: brand.colors,
            }),
            10000,
            "analyzeBrandWithAI"
          );
          if (analysis?.personality) brand.personality = analysis.personality;
          if (analysis?.tone) brand.tone = analysis.tone;
        }

        if (strategyProfileResult) {
          strategyProfileJson = JSON.stringify(strategyProfileResult);
          brand.strategyProfile = strategyProfileResult as unknown as Record<string, unknown>;
        }
      } else {
        // No AI keys: do lightweight heuristic tone/aesthetic inference from scraped text
        if (pageTextExcerpt) {
          const text = pageTextExcerpt.toLowerCase();
          const toneKeywords: string[] = [];

          // Heuristic tone detection from content
          if (/innovat|cutting.edge|advanced|next.gen/i.test(text)) toneKeywords.push("innovative");
          if (/trust|reliable|proven|since \d{4}/i.test(text)) toneKeywords.push("trustworthy");
          if (/simple|easy|effortless|intuitive/i.test(text)) toneKeywords.push("simple");
          if (/premium|luxury|exclusive|high.end/i.test(text)) toneKeywords.push("premium");
          if (/bold|strong|powerful|impact/i.test(text)) toneKeywords.push("bold");
          if (/friendly|welcoming|community|together/i.test(text)) toneKeywords.push("approachable");
          if (/professional|expert|specialist|leader/i.test(text)) toneKeywords.push("professional");
          if (/creative|design|art|vision/i.test(text)) toneKeywords.push("creative");
          if (/sustainable|eco|green|ethical/i.test(text)) toneKeywords.push("sustainable");
          if (/fast|quick|instant|speed/i.test(text)) toneKeywords.push("fast-paced");

          if (toneKeywords.length > 0) {
            brand.toneKeywords = toneKeywords.slice(0, 6);
            brand.tone = toneKeywords.slice(0, 3).join(", ");
          }
        }

        console.info("[extract-brand] No AI keys configured — using heuristic tone analysis. Add OPENAI_API_KEY or ANTHROPIC_API_KEY for richer brand intelligence.");
      }
    }

    // ─── Canonical Brand Intelligence ─────────────────────────────────────────
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

    // ─── Save to DB ────────────────────────────────────────────────────────────
    // Try to find an existing brand for this user+URL and update it (prevents duplicates).
    // If not found, create a new one. This works without any schema migration.
    const existingBrand = await prisma.brand.findFirst({
      where: { userId: authUser.id, siteUrl: href },
      select: { id: true },
    }).catch(() => null);

    const saved = existingBrand
      ? await prisma.brand.update({
          where: { id: existingBrand.id },
          data: {
            ...canonical,
            domain: brand.domain,
            image: brand.image,
            logos: JSON.stringify(brand.logos),
            socialAccounts: brand.socialAccounts?.length ? JSON.stringify(brand.socialAccounts) : null,
            deepAnalysis: deepAnalysisJson,
            strategyProfile: strategyProfileJson,
          },
        })
      : await prisma.brand.create({
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
      {
        error: isTimeout
          ? "Analysis took too long. Please try again or use your homepage URL (e.g. https://example.com)."
          : "Brand extraction failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
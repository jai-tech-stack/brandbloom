import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

type BrandInput = {
  name?: string;
  colors?: string[];
  description?: string;
  tagline?: string;
  personality?: string;
  tone?: string;
  fonts?: string[];
  logos?: string[];
  socialAccounts?: string[];
  visualStyleSummary?: string;
  aestheticNarrative?: string;
  targetAudience?: string;
  toneKeywords?: string[];
  values?: string[];
};

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// ─── 1. Ask Python AssetCreatorAgent to build the prompt ─────────────────────
// This is the key upgrade — instead of weak string concat, we send the full
// brand profile to the Python agent which uses Claude to write a rich,
// brand-specific Flux prompt.
async function buildPromptViaAgent(
  brand: BrandInput,
  assetType: string,
  dimensions: string,
  userPrompt?: string
): Promise<string | null> {
  const agenticUrl = process.env.PYTHON_AGENTIC_URL || process.env.PYTHON_BACKEND_URL;
  if (!agenticUrl) return null;

  try {
    // Build the brand profile in the shape the Python agent expects
    const brandProfile = {
      name: brand.name,
      primary_colors: brand.colors?.slice(0, 3) ?? [],
      secondary_colors: brand.colors?.slice(3, 6) ?? [],
      fonts: brand.fonts ?? [],
      style: brand.visualStyleSummary ?? brand.aestheticNarrative ?? "",
      mood: brand.toneKeywords?.length
        ? brand.toneKeywords
        : [brand.tone, brand.personality].filter(Boolean),
      description: brand.description ?? "",
      target_audience: brand.targetAudience ?? "",
      tagline: brand.tagline ?? "",
    };

    const res = await fetch(`${agenticUrl}/api/agentic/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_type: "create_asset",
        payload: {
          brand_profile: brandProfile,
          asset_type: assetType,
          dimensions,
          copy_text: userPrompt ?? null,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return null;
    const data = await res.json() as { prompt?: string; error?: string };
    return data.prompt?.trim() || null;
  } catch (e) {
    console.warn("[generate-assets] Agent prompt failed, falling back:", (e as Error).message);
    return null;
  }
}

// ─── 2. Local fallback prompt builder (used if Python backend is down) ────────
// Much richer than before — forces specific hex colors, named fonts, visual style.
function buildFallbackPrompt(
  brand: BrandInput | undefined,
  userPrompt: string | undefined,
  assetType: string | undefined,
  dimensions: string
): string {
  const parts: string[] = [];

  // Asset type context first
  const typeDescriptions: Record<string, string> = {
    social: "professional social media post graphic",
    ad: "high-converting advertisement creative",
    banner: "wide banner advertisement",
    thumbnail: "bold click-worthy thumbnail",
    story: "vertical story graphic 9:16 format",
    email: "email header banner",
    "Instagram Post": "Instagram feed post, square format",
    "Instagram Story": "Instagram story, vertical 9:16",
    "LinkedIn Post": "LinkedIn professional post graphic",
    "YouTube Thumbnail": "YouTube thumbnail, bold and high contrast",
    "Display Ad": "display banner ad, conversion-focused",
    "Hero Product Shot": "hero product photography, studio lighting",
    "Blog Hero Image": "editorial blog header image",
  };
  const typeDesc = assetType ? (typeDescriptions[assetType] ?? `${assetType} graphic`) : "marketing visual";
  parts.push(typeDesc);

  // User's specific instruction
  if (userPrompt?.trim()) {
    parts.push(userPrompt.trim());
  }

  // Brand name
  if (brand?.name) parts.push(`for brand "${brand.name}"`);

  // COLORS — the most impactful part for non-generic results
  if (brand?.colors?.length) {
    const hexList = brand.colors.slice(0, 4).join(", ");
    parts.push(`strictly use these exact brand colors: ${hexList}`);
    parts.push(`dominant color palette: ${brand.colors[0]} as primary, ${brand.colors[1] ?? brand.colors[0]} as accent`);
  }

  // TYPOGRAPHY
  if (brand?.fonts?.length) {
    parts.push(`typography using ${brand.fonts.slice(0, 2).join(" and ")} fonts`);
  }

  // VISUAL STYLE — aesthetic narrative is the richest signal
  if (brand?.aestheticNarrative?.trim()) {
    parts.push(brand.aestheticNarrative.trim());
  } else if (brand?.visualStyleSummary?.trim()) {
    parts.push(`visual style: ${brand.visualStyleSummary.trim()}`);
  }

  // TONE
  const toneArr = [
    ...(brand?.toneKeywords ?? []),
    brand?.tone,
    brand?.personality,
  ].filter(Boolean).slice(0, 4) as string[];
  if (toneArr.length) {
    parts.push(`${toneArr.join(", ")} aesthetic and mood`);
  }

  // DESCRIPTION context
  if (brand?.description?.trim()) {
    const short = brand.description.trim().split(".")[0];
    if (short.length > 10 && short.length < 150) parts.push(short);
  }

  // Tagline
  if (brand?.tagline?.trim()) {
    parts.push(`brand tagline: "${brand.tagline}"`);
  }

  // Dimensions hint
  const [w, h] = dimensions.split("x").map(Number);
  if (w && h) {
    parts.push(w > h ? "landscape horizontal composition" : w < h ? "portrait vertical composition" : "square composition");
  }

  // Quality suffix — forces professional output
  parts.push(
    "professional commercial design",
    "polished and high quality",
    "brand-consistent visual identity",
    "sharp details",
    "award-winning graphic design",
    "no text overlays unless specified",
  );

  return parts.join(". ");
}

// ─── 3. Replicate image generation ───────────────────────────────────────────
function aspectRatioToSize(ratio: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "4:5": { width: 1024, height: 1280 },
    "9:16": { width: 768, height: 1344 },
    "2:3": { width: 832, height: 1248 },
    "3:4": { width: 896, height: 1152 },
    "16:9": { width: 1344, height: 768 },
    "1.91:1": { width: 1344, height: 704 },
    "4:3": { width: 1152, height: 896 },
    "5:4": { width: 1152, height: 960 },
    "3:2": { width: 1248, height: 832 },
    "21:9": { width: 1536, height: 640 },
  };
  return map[ratio] ?? { width: 1024, height: 1024 };
}

function aspectRatioToSize4K(ratio: string): { width: number; height: number } {
  const base = aspectRatioToSize(ratio);
  const scale = Math.min(2048 / Math.max(base.width, base.height), 2);
  return {
    width: Math.round((base.width * scale) / 64) * 64,
    height: Math.round((base.height * scale) / 64) * 64,
  };
}

// Dimensions string for agent e.g. "2048x2048" (premium-only 4K)
function dimensionsString(ratio: string): string {
  const size = aspectRatioToSize4K(ratio);
  return `${size.width}x${size.height}`;
}

async function generateWithReplicate(
  prompt: string,
  aspectRatio: string
): Promise<{ url: string; width: number; height: number } | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  const model = "black-forest-labs/flux-1.1-pro";
  const size = aspectRatioToSize4K(aspectRatio);

  const input: Record<string, unknown> = {
    prompt,
    width: size.width,
    height: size.height,
    output_quality: 100,
    output_format: "webp",
    disable_safety_checker: false,
    prompt_upsampling: true,
    safety_tolerance: 2,
  };

  try {
    const createRes = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=30",
        },
        body: JSON.stringify({ input }),
      }
    );

    if (!createRes.ok) {
      console.warn("[generate-assets] Replicate error:", await createRes.text());
      return null;
    }

    const prediction = await createRes.json() as {
      id?: string; status?: string;
      output?: string | string[]; error?: string;
      urls?: { get?: string };
    };

    if (prediction.error) return null;

    if (prediction.status === "succeeded" && prediction.output) {
      const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      return { url, width: size.width, height: size.height };
    }

    if (prediction.id && prediction.urls?.get) {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(prediction.urls.get!, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await poll.json() as { status?: string; output?: string | string[]; error?: string };
        if (result.status === "succeeded" && result.output) {
          const url = Array.isArray(result.output) ? result.output[0] : result.output;
          return { url, width: size.width, height: size.height };
        }
        if (result.status === "failed" || result.error) return null;
      }
    }
    return null;
  } catch (e) {
    console.error("[generate-assets] Replicate failed:", (e as Error).message);
    return null;
  }
}

// ─── 4. Gemini via Python server.py ──────────────────────────────────────────
async function generateWithGemini(prompt: string): Promise<string | null> {
  const imageUrl = process.env.PYTHON_IMAGE_URL;
  if (!imageUrl) return null;
  try {
    const res = await fetch(`${imageUrl}/api/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, session_id: `bb-${Date.now()}` }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { success?: boolean; image_url?: string };
    return data.success && data.image_url ? data.image_url : null;
  } catch (e) {
    console.warn("[generate-assets] Gemini failed:", (e as Error).message);
    return null;
  }
}

function getDemoImage(width: number, height: number, label: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(label)}/${width}/${height}`;
}

// ─── 5. Main handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { credits: true, name: true, email: true },
    }).catch(() => null);

    if (userRecord && typeof userRecord.credits === "number" && userRecord.credits < 1) {
      return NextResponse.json(
        { error: "You're out of credits. Please upgrade your plan." },
        { status: 402 }
      );
    }

    const body = await request.json().catch(() => ({})) as {
      url?: string;
      brand?: BrandInput;
      brandId?: string;
      promptOverride?: string;
      ideaType?: string;
      aspectRatio?: string;
      limit?: number;
      premiumIdeas?: boolean;
    };

    const {
      brand,
      brandId,
      promptOverride,
      ideaType,
      aspectRatio = "1:1",
      limit = 1,
      premiumIdeas: _premiumIdeas = false,
    } = body;

    const resolvedPremiumIdeas = _premiumIdeas;  // ✅ FIXED: respect user preference

    const resolvedAspect = aspectRatio === "__auto__" ? "1:1" : aspectRatio;
    const dims = dimensionsString(resolvedAspect);
    const size = aspectRatioToSize4K(resolvedAspect);

    // If caller only sends brandId, hydrate brand context from DB so generation stays on-brand.
    let resolvedBrand: BrandInput | undefined = brand;
    if (!resolvedBrand && brandId) {
      const dbBrand = await prisma.brand.findFirst({
        where: { id: brandId, userId: authUser.id },
        select: {
          name: true,
          description: true,
          tagline: true,
          personality: true,
          tone: true,
          visualStyle: true,
          targetAudience: true,
          primaryColor: true,
          secondaryColors: true,
          headingFont: true,
          bodyFont: true,
          logos: true,
          image: true,
        },
      });
      if (dbBrand) {
        const colors = [dbBrand.primaryColor, ...parseJsonArray(dbBrand.secondaryColors)].filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        );
        const fonts = [dbBrand.headingFont, dbBrand.bodyFont].filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        );
        const logos = [...parseJsonArray(dbBrand.logos), dbBrand.image].filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        );
        resolvedBrand = {
          name: dbBrand.name,
          description: dbBrand.description ?? undefined,
          tagline: dbBrand.tagline ?? undefined,
          personality: dbBrand.personality ?? undefined,
          tone: dbBrand.tone ?? undefined,
          visualStyleSummary: dbBrand.visualStyle ?? undefined,
          targetAudience: dbBrand.targetAudience ?? undefined,
          colors,
          fonts,
          logos,
        };
      }
    }

    // ── Build prompt: try Python agent first, fall back to local ──────────────
    let prompt: string | null = null;

    if (resolvedBrand) {
      // Try the AssetCreatorAgent (Claude-powered, brand-aware)
      prompt = await buildPromptViaAgent(resolvedBrand, ideaType ?? "social", dims, promptOverride);
      if (prompt) {
        console.info("[generate-assets] Using agent-built prompt for", resolvedBrand.name);
      }
    }

    // Fallback: local rich prompt builder
    if (!prompt) {
      prompt = buildFallbackPrompt(resolvedBrand, promptOverride, ideaType, dims);
      console.info("[generate-assets] Using fallback prompt");
    }
    if (resolvedPremiumIdeas) {
      prompt = `${prompt}. Concept emphasis: premium creative direction, bold original visual concept, campaign-grade composition, scroll-stopping idea.`;
    }

    const hasReplicate = !!process.env.REPLICATE_API_TOKEN;
    const hasGemini = !!process.env.PYTHON_IMAGE_URL;

    // ✅ FIXED: Check that at least one generation method is available
    if (!hasReplicate && !hasGemini) {
      return NextResponse.json(
        {
          error: "Generation services not configured. Contact support or try again later.",
          assets: [],
          remainingCredits: userRecord?.credits ?? 0,
        },
        { status: 503 }
      );
    }

    const results = [];
    let replicateAttempted = false;
    let demo = false;
    for (let i = 0; i < Math.min(limit, 4); i++) {
      let imageUrl: string | null = null;
      let imgWidth = size.width;
      let imgHeight = size.height;

      // Try Replicate first (higher quality Flux model)
      if (hasReplicate) {
        replicateAttempted = true;
        const result = await generateWithReplicate(prompt, resolvedAspect);
        if (result) {
          imageUrl = result.url;
          imgWidth = result.width;
          imgHeight = result.height;
        }
      }

      // Fall back to Gemini via Python server.py
      if (!imageUrl && hasGemini) {
        imageUrl = await generateWithGemini(prompt);
      }

      if (imageUrl) {
        results.push({
          id: `${Date.now()}-${i}`,
          url: imageUrl,
          label: promptOverride?.slice(0, 50) ?? ideaType ?? "Brand asset",
          type: ideaType ?? "general",
          width: imgWidth,
          height: imgHeight,
          prompt,
        });
      } else {
        // ✅ FIXED: Return error instead of silent demo fallback
        return NextResponse.json(
          {
            error: "Generation failed. Please try again or contact support.",
            assets: [],
            remainingCredits: userRecord?.credits ?? 0,
          },
          { status: 500 }
        );
      }
    }

    // Deduct credits
    let remainingCredits: number | undefined;
    const creditCost = 2;
    try {
      const updated = await prisma.user.update({
        where: { id: authUser.id },
        data: {
          credits: {
            decrement: creditCost * results.length,
          },
        },
        select: { credits: true },
      });
      remainingCredits = updated.credits;

      // Low credit warning email at exactly 3 credits
      if (remainingCredits === 3 && userRecord?.email) {
        import("@/lib/email").then(({ sendLowCreditsEmail }) => {
          sendLowCreditsEmail({
            to: userRecord.email!,
            name: userRecord.name ?? undefined,
            credits: 3,
          }).catch(() => { /* non-fatal */ });
        }).catch(() => { /* non-fatal */ });
      }
    } catch { /* non-fatal */ }

    // Save assets to DB
    if (brandId && results.length > 0) {
      const toSave = results.filter((r) => !r.id.startsWith("demo"));
      if (toSave.length > 0) {
        await prisma.asset.createMany({
          data: toSave.map((r) => ({
            brandId,
            userId: authUser.id,
            url: r.url,
            label: r.label,
            type: r.type,
            width: r.width,
            height: r.height,
            prompt: r.prompt,
            status: "complete",
          })),
          skipDuplicates: true,
        }).catch(() => { /* non-fatal */ });
      }
    }

    return NextResponse.json({
      assets: results,
      replicateAttempted,
      credits: remainingCredits,
      promptUsed: prompt, // useful for debugging
    });
  } catch (e) {
    console.error("[generate-assets] error:", e);
    return NextResponse.json(
      { error: "Asset generation failed. Please try again." },
      { status: 500 }
    );
  }
}

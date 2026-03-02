import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

// Python backend URL (FastAPI on port 8001 or env-configured)
const PYTHON_API = process.env.PYTHON_BACKEND_URL || "http://localhost:8001";

// ─── Types ────────────────────────────────────────────────────────────────────
type LogoBrandBody = {
  logoBase64: string;
  mimeType: string;
  brandName: string;
  tagline?: string;
  industry?: string;
  tone?: string;
  targetAudience?: string;
  description?: string;
};

// ─── 1. Upload logo to imgbb for a persistent URL ─────────────────────────────
async function uploadToImgbb(base64: string): Promise<string | null> {
  const key = process.env.IMGBB_API_KEY;
  if (!key) return null;
  try {
    const form = new FormData();
    form.append("key", key);
    form.append("image", base64);
    const r = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
    const d = await r.json() as { success?: boolean; data?: { url?: string } };
    return d.success && d.data?.url ? d.data.url : null;
  } catch {
    return null;
  }
}

// ─── 2. Run logo generation strategy via Python agent pipeline ────────────────
// Calls POST /api/agentic/run with request_type=logo_generation
// Returns: { strategy, concepts, image_urls, rankings }
async function runLogoGenerationAgent(brandProfile: Record<string, unknown>): Promise<{
  strategy?: Record<string, unknown>;
  concepts?: string[];
  imageUrls?: string[];
  rankings?: Array<{ rank?: number; score?: number; reason?: string }>;
} | null> {
  try {
    const r = await fetch(`${PYTHON_API}/api/agentic/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_type: "logo_generation", payload: brandProfile }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!r.ok) return null;
    const d = await r.json() as {
      strategy?: Record<string, unknown>;
      concepts?: string[];
      image_urls?: string[];
      rankings?: Array<{ rank?: number; score?: number; reason?: string }>;
    };
    return {
      strategy: d.strategy,
      concepts: d.concepts,
      imageUrls: d.image_urls,
      rankings: d.rankings,
    };
  } catch (e) {
    // Python backend unreachable — skip, continue with Claude-only analysis
    console.warn("[create-logo-brand] Python backend unreachable:", (e as Error).message);
    return null;
  }
}

// ─── 3. Analyze logo with Claude Vision (Anthropic API directly) ──────────────
async function analyzeLogoWithClaude(
  logoBase64: string,
  mimeType: string,
  brandInfo: Omit<LogoBrandBody, "logoBase64" | "mimeType">
) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const validMime = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)
    ? mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    : "image/png" as const;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: validMime, data: logoBase64 },
          },
          {
            type: "text",
            text: `You are a brand identity expert. Analyze this logo for brand "${brandInfo.brandName}"${brandInfo.industry ? ` (${brandInfo.industry})` : ""}.${brandInfo.description ? ` Description: ${brandInfo.description}` : ""}
${brandInfo.tone ? `User-stated tone: ${brandInfo.tone}` : ""}

Return ONLY a JSON object with exactly these fields:
{
  "colors": ["#hex1", "#hex2", ...],
  "fonts": ["Font Name 1", "Font Name 2"],
  "personality": "one sentence",
  "tone": "comma, separated, keywords",
  "aestheticNarrative": "2-3 sentences describing the visual mood and feel",
  "visualStyleSummary": "short phrase like 'Dark minimalist with bold typography'",
  "toneKeywords": ["keyword1", "keyword2"],
  "values": ["value1", "value2"]
}

No explanation. JSON only.`,
          },
        ],
      }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return null;
  const d = await res.json() as { content?: Array<{ type: string; text?: string }> };
  const text = d.content?.find((b) => b.type === "text")?.text ?? "";

  try {
    const clean = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as {
      colors?: unknown;
      fonts?: unknown;
      personality?: unknown;
      tone?: unknown;
      aestheticNarrative?: unknown;
      visualStyleSummary?: unknown;
      toneKeywords?: unknown;
      values?: unknown;
    };
    return {
      colors: (Array.isArray(parsed.colors) ? parsed.colors : []).filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{3,6}$/.test(c)).slice(0, 6),
      fonts: (Array.isArray(parsed.fonts) ? parsed.fonts : []).filter((f): f is string => typeof f === "string").slice(0, 4),
      personality: typeof parsed.personality === "string" ? parsed.personality : "",
      tone: typeof parsed.tone === "string" ? parsed.tone : "",
      aestheticNarrative: typeof parsed.aestheticNarrative === "string" ? parsed.aestheticNarrative : "",
      visualStyleSummary: typeof parsed.visualStyleSummary === "string" ? parsed.visualStyleSummary : "",
      toneKeywords: (Array.isArray(parsed.toneKeywords) ? parsed.toneKeywords : []).filter((t): t is string => typeof t === "string").slice(0, 8),
      values: (Array.isArray(parsed.values) ? parsed.values : []).filter((v): v is string => typeof v === "string").slice(0, 5),
    };
  } catch {
    return null;
  }
}

// ─── 4. Fallback: infer from user-provided info only (no AI keys needed) ──────
function buildFallbackProfile(info: Omit<LogoBrandBody, "logoBase64" | "mimeType">) {
  const toneArr = info.tone?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  return {
    colors: [] as string[],
    fonts: [] as string[],
    personality: toneArr.slice(0, 3).join(", ") || "Professional",
    tone: info.tone ?? "Professional",
    aestheticNarrative: info.description ?? `${info.brandName} brand identity.`,
    visualStyleSummary: toneArr[0] ?? "Clean and professional",
    toneKeywords: toneArr.slice(0, 6),
    values: [] as string[],
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as LogoBrandBody;
    const { logoBase64, mimeType, brandName, tagline, industry, tone, targetAudience, description } = body;

    if (!logoBase64) return NextResponse.json({ error: "Logo image required." }, { status: 400 });
    if (!brandName?.trim()) return NextResponse.json({ error: "Brand name required." }, { status: 400 });
    if (logoBase64.length > 14_000_000) return NextResponse.json({ error: "Logo too large (max 10MB)." }, { status: 400 });

    const brandInfo = { brandName: brandName.trim(), tagline, industry, tone, targetAudience, description };

    // Run AI analysis and logo generation in parallel — both are optional/fallback-safe
    const [logoUrl, analysis, agentResult] = await Promise.all([
      uploadToImgbb(logoBase64),
      analyzeLogoWithClaude(logoBase64, mimeType ?? "image/png", brandInfo)
        .catch(() => null),
      // Build a brand profile to send to Python logo generation agent
      // We run this in parallel; it's non-blocking — result enriches the saved brand
      Promise.resolve(null), // placeholder; we'll call after analysis
    ]);

    // Use analysis or fallback
    const a = analysis ?? buildFallbackProfile(brandInfo);

    // Merge user-provided tone with AI-extracted
    const userToneArr = tone ? tone.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const mergedToneKeywords = [...new Set([...a.toneKeywords, ...userToneArr])].slice(0, 8);
    const mergedTone = tone ?? a.tone;
    const mergedPersonality = tone
      ? `${tone}${a.personality ? `, ${a.personality}` : ""}`
      : a.personality;

    // Build brand profile for Python agent (fire-and-forget)
    const brandProfileForAgent = {
      name: brandName.trim(),
      logo_url: logoUrl ?? undefined,
      primary_colors: a.colors.slice(0, 3),
      secondary_colors: a.colors.slice(3),
      fonts: a.fonts,
      style: a.visualStyleSummary,
      mood: mergedToneKeywords,
      industry: industry ?? undefined,
      target_audience: targetAudience ?? undefined,
      description: description ?? a.aestheticNarrative,
    };

    // Run logo generation agent in background (don't await — save result separately)
    runLogoGenerationAgent(brandProfileForAgent).then((agentRes) => {
      if (agentRes?.concepts?.length) {
        // Store concepts in the brand's deepAnalysis later if desired
        console.info(`[create-logo-brand] Agent generated ${agentRes.concepts.length} logo concepts for "${brandName}"`);
      }
    }).catch(() => { /* silent */ });

    // Save brand to DB
    const colorsJson = JSON.stringify(a.colors);
    const fontsJson = JSON.stringify(a.fonts);

    const saved = await prisma.brand.create({
      data: {
        userId: authUser.id,
        name: brandName.trim(),
        sourceType: "logo",
        source: "logo",
        logoUrl: logoUrl ?? undefined,
        image: logoUrl ?? undefined,
        logos: logoUrl ? JSON.stringify([logoUrl]) : undefined,

        // Canonical brand intelligence fields
        primaryColor: a.colors[0] ?? undefined,
        secondaryColors: a.colors.length > 1 ? JSON.stringify(a.colors.slice(1)) : undefined,
        headingFont: a.fonts[0] ?? undefined,
        bodyFont: a.fonts[1] ?? undefined,
        toneOfVoice: mergedTone,
        personalityTraits: mergedToneKeywords.length ? JSON.stringify(mergedToneKeywords) : undefined,
        industry: industry ?? undefined,
        targetAudience: targetAudience ?? undefined,
        visualStyle: a.visualStyleSummary || undefined,
        tagline: tagline?.trim() || undefined,
        brandStory: description?.trim() || undefined,

        // Legacy fields (kept for compatibility with existing UI)
        colors: colorsJson,
        fonts: fontsJson,
        personality: mergedPersonality || undefined,
        tone: mergedTone || undefined,
        description: description ?? a.aestheticNarrative || undefined,

        deepAnalysis: JSON.stringify({
          aestheticNarrative: a.aestheticNarrative,
          visualStyleSummary: a.visualStyleSummary,
          toneKeywords: mergedToneKeywords,
          values: a.values,
          targetAudience: targetAudience,
          agentConceptsScheduled: true,
        }),
      },
    });

    return NextResponse.json({
      brandId: saved.id,
      name: brandName.trim(),
      colors: a.colors,
      fonts: a.fonts,
      personality: mergedPersonality,
      tone: mergedTone,
      aestheticNarrative: a.aestheticNarrative,
      logoUrl,
    });
  } catch (e) {
    console.error("[create-logo-brand] error:", e);
    return NextResponse.json({ error: "Brand creation failed. Please try again." }, { status: 500 });
  }
}
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

/**
 * Build a rich brand-aware generation prompt.
 * This is the single most important function — every quality issue in generated
 * images traces back to a weak prompt. Be as specific as possible.
 */
import { sendLowCreditsEmail } from "@/lib/email";

function buildGenerationPrompt(
  brand: BrandInput | undefined,
  promptOverride: string | undefined,
  ideaType: string | undefined
): string {
  const baseParts: string[] = [];

  // User's specific request takes precedence
  if (promptOverride?.trim()) {
    baseParts.push(promptOverride.trim());
  }

  // Brand name context
  if (brand?.name?.trim()) {
    baseParts.push(`for ${brand.name}`);
  }

  // Aesthetic narrative — most valuable for style adherence
  if (brand?.aestheticNarrative?.trim()) {
    baseParts.push(brand.aestheticNarrative.trim());
  }

  // Visual style summary
  if (brand?.visualStyleSummary?.trim()) {
    baseParts.push(brand.visualStyleSummary.trim());
  }

  // Colors — very specific hex values guide the model well
  if (brand?.colors?.length) {
    const colorList = brand.colors.slice(0, 4).join(", ");
    baseParts.push(`using brand colors ${colorList}`);
  }

  // Tone/personality
  if (brand?.tone?.trim() || brand?.personality?.trim()) {
    const toneStr = [brand.tone, brand.personality].filter(Boolean).join(", ");
    baseParts.push(`${toneStr} aesthetic`);
  } else if (brand?.toneKeywords?.length) {
    baseParts.push(brand.toneKeywords.slice(0, 3).join(", ") + " feel");
  }

  // Description (brief)
  if (brand?.description?.trim()) {
    const shortDesc = brand.description.trim().split(".")[0];
    if (shortDesc.length > 10 && shortDesc.length < 120) {
      baseParts.push(shortDesc);
    }
  }

  // Quality suffix — always append these for professional results
  const qualitySuffix = "professional commercial design, polished, high quality, brand-consistent, photorealistic or editorial style";

  const prompt = baseParts.join(". ");
  return prompt ? `${prompt}. ${qualitySuffix}` : `Professional branded marketing image. ${qualitySuffix}`;
}

/**
 * Convert aspect ratio string to width/height for Replicate.
 */
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

/**
 * 4K size — double resolution
 */
function aspectRatioToSize4K(ratio: string): { width: number; height: number } {
  const base = aspectRatioToSize(ratio);
  // Replicate max is typically 2048 for flux-1.1-pro
  const scale = Math.min(2048 / Math.max(base.width, base.height), 2);
  return {
    width: Math.round(base.width * scale / 64) * 64,
    height: Math.round(base.height * scale / 64) * 64,
  };
}

/**
 * Generate image via Replicate Flux.
 * Standard: flux-schnell (fast, cheap)
 * Quality: flux-1.1-pro (better quality)
 * 4K: flux-1.1-pro with higher resolution
 */
async function generateWithReplicate(
  prompt: string,
  aspectRatio: string,
  quality: "standard" | "quality" | "4k" = "standard"
): Promise<{ url: string; width: number; height: number } | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  const is4k = quality === "4k";
  const isQuality = quality === "quality" || quality === "4k";

  // Model selection:
  // - flux-schnell: fast, good for drafts
  // - flux-1.1-pro: higher quality, slower, better for final assets + 4K
  const model = isQuality
    ? "black-forest-labs/flux-1.1-pro"
    : "black-forest-labs/flux-schnell";

  const size = is4k ? aspectRatioToSize4K(aspectRatio) : aspectRatioToSize(aspectRatio);

  const input: Record<string, unknown> = {
    prompt,
    width: size.width,
    height: size.height,
    output_quality: is4k ? 100 : 80,
    output_format: "webp",
    disable_safety_checker: false,
  };

  if (isQuality) {
    // flux-1.1-pro specific params
    input.prompt_upsampling = true;
    input.safety_tolerance = 2;
  } else {
    // flux-schnell specific
    input.num_inference_steps = 4;
    input.go_fast = true;
  }

  try {
    const createRes = await fetch("https://api.replicate.com/v1/models/" + model + "/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=30",
      },
      body: JSON.stringify({ input }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.warn("[generate-assets] Replicate error:", err);
      return null;
    }

    const prediction = await createRes.json() as {
      id?: string;
      status?: string;
      output?: string | string[];
      error?: string;
      urls?: { get?: string };
    };

    if (prediction.error) {
      console.warn("[generate-assets] Replicate prediction error:", prediction.error);
      return null;
    }

    // Completed immediately
    if (prediction.status === "succeeded" && prediction.output) {
      const out = prediction.output;
      const url = Array.isArray(out) ? out[0] : out;
      return { url, width: size.width, height: size.height };
    }

    // Poll
    if (prediction.id && prediction.urls?.get) {
      const pollUrl = prediction.urls.get;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(pollUrl, { headers: { Authorization: `Bearer ${token}` } });
        const result = await poll.json() as { status?: string; output?: string | string[]; error?: string };

        if (result.status === "succeeded" && result.output) {
          const out = result.output;
          const url = Array.isArray(out) ? out[0] : out;
          return { url, width: size.width, height: size.height };
        }
        if (result.status === "failed" || result.error) {
          console.warn("[generate-assets] Poll failed:", result.error);
          return null;
        }
      }
    }

    return null;
  } catch (e) {
    console.error("[generate-assets] Replicate call failed:", (e as Error).message);
    return null;
  }
}

/** Demo/placeholder image for when Replicate is not configured */
function getDemoImage(width: number, height: number, label: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(label)}/${width}/${height}`;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    // Check credits
    const userRecord = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { credits: true },
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
      quality?: "standard" | "quality" | "4k";
    };

    const {
      brand,
      brandId,
      promptOverride,
      ideaType,
      aspectRatio = "1:1",
      limit = 1,
      quality = "standard",
    } = body;

    const prompt = buildGenerationPrompt(brand, promptOverride, ideaType);
    const resolvedAspect = aspectRatio === "__auto__" ? "1:1" : aspectRatio;
    const size = (quality === "4k" ? aspectRatioToSize4K : aspectRatioToSize)(resolvedAspect);

    const hasToken = !!process.env.REPLICATE_API_TOKEN;
    const results = [];
    let replicateAttempted = false;
    let demo = false;

    // Determine effective quality — use 'quality' model for 4k too
    const replicateQuality: "standard" | "quality" | "4k" =
      quality === "4k" ? "4k" : quality;

    for (let i = 0; i < Math.min(limit, 4); i++) {
      if (hasToken) {
        replicateAttempted = true;
        const result = await generateWithReplicate(prompt, resolvedAspect, replicateQuality);
        if (result) {
          results.push({
            id: `${Date.now()}-${i}`,
            url: result.url,
            label: promptOverride?.slice(0, 50) ?? ideaType ?? "Brand asset",
            type: ideaType ?? "general",
            width: result.width,
            height: result.height,
            prompt,
          });
        } else {
          // Replicate attempted but failed — use demo
          demo = true;
          results.push({
            id: `demo-${Date.now()}-${i}`,
            url: getDemoImage(size.width, size.height, `${brand?.name ?? "brand"}-${i}`),
            label: promptOverride?.slice(0, 50) ?? ideaType ?? "Brand asset (placeholder)",
            type: ideaType ?? "general",
            width: size.width,
            height: size.height,
            prompt,
          });
        }
      } else {
        demo = true;
        results.push({
          id: `demo-${Date.now()}-${i}`,
          url: getDemoImage(size.width, size.height, `${brand?.name ?? "brand"}-${i}`),
          label: promptOverride?.slice(0, 50) ?? ideaType ?? "Brand asset (placeholder)",
          type: ideaType ?? "general",
          width: size.width,
          height: size.height,
          prompt,
        });
      }
    }

    // Deduct credit(s)
    let remainingCredits: number | undefined;
    const creditCost = quality === "4k" ? 2 : 1;
    if (!demo) {
      try {
        const updated = await prisma.user.update({
          where: { id: authUser.id },
          data: { credits: { decrement: creditCost * results.filter((r) => !r.id.startsWith("demo")).length } },
          select: { credits: true },
        });
        remainingCredits = updated.credits;
        if (remainingCredits === 3 && authUser.email) {
          sendLowCreditsEmail({ to: authUser.email, name: authUser.name ?? undefined, credits: 3 }).catch(console.error);
        }
      } catch { /* non-fatal */ }
    }

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
          })),
          skipDuplicates: true,
        }).catch(() => { /* non-fatal */ });
      }
    }

    return NextResponse.json({
      assets: results,
      demo,
      replicateAttempted,
      credits: remainingCredits,
    });
  } catch (e) {
    console.error("[generate-assets] error:", e);
    return NextResponse.json(
      { error: "Asset generation failed. Please try again." },
      { status: 500 }
    );
  }
}
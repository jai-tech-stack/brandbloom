import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

type BrandInput = {
  name?: string;
  colors?: string[];
  description?: string;
  personality?: string;
  tone?: string;
  aestheticNarrative?: string;
  targetAudience?: string;
};

/**
 * Build a rich brand-aware style prompt for img2img transformation.
 */
function buildPhotoPrompt(brand: BrandInput | undefined): string {
  const parts: string[] = [];

  if (brand?.name) parts.push(`${brand.name} brand style`);
  if (brand?.aestheticNarrative?.trim()) {
    parts.push(brand.aestheticNarrative.trim());
  }
  if (brand?.description?.trim()) {
    parts.push(brand.description.trim());
  }
  if (brand?.colors?.length) {
    const colorDesc = brand.colors.slice(0, 4).join(", ");
    parts.push(`brand colors: ${colorDesc}`);
  }
  if (brand?.personality?.trim()) parts.push(brand.personality.trim());
  if (brand?.tone?.trim()) parts.push(brand.tone.trim());
  if (brand?.targetAudience?.trim()) parts.push(`for ${brand.targetAudience}`);

  const styleBase = "professional product photography, studio quality, on-brand styling, polished, high-end commercial look";

  return parts.length > 0
    ? `${parts.join(", ")}. ${styleBase}`
    : `Professional branded product photo, studio quality, commercial photography, premium aesthetic`;
}

/**
 * Upload a file to a temporary hosting service so Replicate can access it via URL.
 * We use imgbb or similar — for self-hosted, use Cloudflare R2 / S3.
 * Falls back to base64 data URL if no upload service configured.
 */
async function uploadBase64ToTemp(base64: string, mimeType: string): Promise<string | null> {
  const imgbbKey = process.env.IMGBB_API_KEY;

  if (imgbbKey) {
    try {
      const form = new FormData();
      form.append("key", imgbbKey);
      form.append("image", base64);
      const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
      const data = await res.json() as { data?: { url?: string }; success?: boolean };
      if (data.success && data.data?.url) {
        return data.data.url;
      }
    } catch (e) {
      console.warn("[upload-photo] imgbb upload failed:", (e as Error).message);
    }
  }

  // Fallback: return as data URL (works with some Replicate models)
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Call Replicate img2img to style-transfer the user photo into a branded asset.
 * Uses flux-1.1-pro with image conditioning for best results.
 */
async function brandPhotoWithReplicate(
  imageUrl: string,
  prompt: string,
  quality: "standard" | "4k" = "standard"
): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  const is4k = quality === "4k";

  // Use flux-1.1-pro for img2img — supports image_url as conditioning input
  const body = {
    // flux-kontext-pro is excellent for img2img/style transfer
    version: "black-forest-labs/flux-1.1-pro",
    input: {
      prompt,
      image: imageUrl,
      // img2img strength — 0.75 keeps original composition, applies brand style
      prompt_strength: 0.75,
      aspect_ratio: "1:1",
      output_quality: is4k ? 100 : 80,
      // Larger output for 4K
      ...(is4k ? { megapixels: "1" } : {}),
    },
  };

  try {
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=30",
      },
      body: JSON.stringify(body),
    });

    const prediction = await createRes.json() as {
      id?: string;
      status?: string;
      output?: string | string[];
      error?: string;
      urls?: { get?: string };
    };

    if (prediction.error) {
      console.warn("[upload-photo] Replicate error:", prediction.error);
      return null;
    }

    // If completed immediately
    if (prediction.status === "succeeded" && prediction.output) {
      const out = prediction.output;
      return Array.isArray(out) ? out[0] : out;
    }

    // Poll for completion
    if (prediction.id && prediction.urls?.get) {
      const pollUrl = prediction.urls.get;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await poll.json() as { status?: string; output?: string | string[]; error?: string };
        if (result.status === "succeeded" && result.output) {
          const out = result.output;
          return Array.isArray(out) ? out[0] : out;
        }
        if (result.status === "failed" || result.error) {
          console.warn("[upload-photo] Replicate prediction failed:", result.error);
          return null;
        }
      }
    }

    return null;
  } catch (e) {
    console.error("[upload-photo] Replicate call failed:", (e as Error).message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Sign in required to brand photos." },
        { status: 401 }
      );
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
      imageBase64?: string;
      mimeType?: string;
      imageUrl?: string;
      brand?: BrandInput;
      brandId?: string;
      quality?: "standard" | "4k";
    };

    const { imageBase64, mimeType, imageUrl: directUrl, brand, brandId, quality = "standard" } = body;

    if (!imageBase64 && !directUrl) {
      return NextResponse.json(
        { error: "Either imageBase64 or imageUrl is required." },
        { status: 400 }
      );
    }

    // Get uploadable URL
    let photoUrl: string | null = directUrl ?? null;

    if (imageBase64 && !photoUrl) {
      const mt = mimeType ?? "image/jpeg";
      photoUrl = await uploadBase64ToTemp(imageBase64, mt);
    }

    if (!photoUrl) {
      return NextResponse.json(
        { error: "Could not process image for upload." },
        { status: 422 }
      );
    }

    // Validate file size: base64 length → ~bytes. 10MB limit.
    if (imageBase64 && imageBase64.length > 14_000_000) {
      return NextResponse.json(
        { error: "Image too large. Please use an image under 10MB." },
        { status: 400 }
      );
    }

    const prompt = buildPhotoPrompt(brand);
    const resultUrl = await brandPhotoWithReplicate(photoUrl, prompt, quality);

    if (!resultUrl) {
      // If Replicate not configured or failed — return a helpful error
      const hasToken = !!process.env.REPLICATE_API_TOKEN;
      if (!hasToken) {
        return NextResponse.json(
          {
            error: "REPLICATE_API_TOKEN not configured. Add it to your .env to enable photo branding.",
            demo: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Photo branding failed. Replicate returned no output. Check your token and billing." },
        { status: 500 }
      );
    }

    // Deduct credit
    let remainingCredits: number | undefined;
    const creditCost = quality === "4k" ? 2 : 1;
    try {
      const updated = await prisma.user.update({
        where: { id: authUser.id },
        data: { credits: { decrement: creditCost } },
        select: { credits: true },
      });
      remainingCredits = updated.credits;
    } catch {
      // Non-fatal — don't block response
    }

    // Save asset to DB if we have a brandId
    if (brandId) {
      try {
        await prisma.asset.create({
          data: {
            brandId,
            userId: authUser.id,
            url: resultUrl,
            label: "Branded photo",
            type: "photo",
            width: quality === "4k" ? 2048 : 1024,
            height: quality === "4k" ? 2048 : 1024,
            prompt,
          },
        });
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({
      url: resultUrl,
      label: `${brand?.name ? brand.name + " — " : ""}Branded photo`,
      credits: remainingCredits,
    });
  } catch (e) {
    console.error("[upload-photo] error:", e);
    return NextResponse.json(
      { error: "Photo branding failed. Please try again." },
      { status: 500 }
    );
  }
}
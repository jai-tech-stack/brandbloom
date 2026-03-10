// src/app/api/upload-asset/route.ts
// BUG FIX B2: Replaced stability-ai/stable-diffusion-img2img (deprecated & removed from Replicate 2024)
// with black-forest-labs/flux-1.1-pro — same pattern as /api/upload-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function buildUrlPhotoPrompt(brand: {
  name?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  aesthetic?: string | null;
  tone?: string | null;
}): string {
  const colors = [brand.primaryColor, brand.secondaryColor, brand.accentColor]
    .filter(Boolean)
    .join(", ");
  const brandName = brand.name ?? "the brand";
  const aesthetic = brand.aesthetic ?? "modern professional";
  const tone = brand.tone ?? "professional";

  return (
    `Transform this image into a branded marketing asset for ${brandName}. ` +
    `Apply a ${aesthetic} visual style with a ${tone} tone. ` +
    (colors ? `Incorporate brand colors: ${colors}. ` : "") +
    `Maintain the subject matter while enhancing it with professional brand aesthetics, ` +
    `clean composition, and high-quality commercial photography style. ` +
    `Make it suitable for social media and marketing use.`
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, brandId } = body as {
      imageUrl?: string;
      brandId?: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    // Validate it's an actual URL
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid image URL" },
        { status: 400 }
      );
    }

    // Load brand context if provided
    let brand: {
      name?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      accentColor?: string | null;
      aesthetic?: string | null;
      tone?: string | null;
    } = {};

    if (brandId) {
      const dbBrand = await prisma.brand.findFirst({
        where: { id: brandId, userId: user.id },
        select: {
          name: true,
          primaryColor: true,
          secondaryColors: true,
          tone: true,
          visualStyle: true,
        },
      });
      if (dbBrand) {
        brand = {
          name: dbBrand.name,
          primaryColor: dbBrand.primaryColor,
          secondaryColor: dbBrand.secondaryColors ?? undefined,
          accentColor: undefined,
          aesthetic: dbBrand.visualStyle ?? undefined,
          tone: dbBrand.tone ?? undefined,
        };
      }
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Image generation not available. Set REPLICATE_API_TOKEN to enable.",
        },
        { status: 503 }
      );
    }

    const prompt = buildUrlPhotoPrompt(brand);

    // FIX B2: flux-1.1-pro supports image-to-image via `image` + `prompt_strength`
    // Previously used: "stability-ai/stable-diffusion-img2img" (REMOVED from Replicate in 2024)
    const output = await replicate.run(
      "black-forest-labs/flux-1.1-pro" as `${string}/${string}`,
      {
        input: {
          prompt,
          image: imageUrl,
          prompt_strength: 0.75, // 0 = keep original, 1 = ignore original. 0.75 matches upload-photo
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 90,
          safety_tolerance: 2,
        },
      }
    );

    // flux-1.1-pro returns a single URL string or an array
    let resultUrl: string | null = null;
    if (typeof output === "string") {
      resultUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      resultUrl = String(output[0]);
    } else if (output && typeof (output as { url?: () => string }).url === "function") {
      resultUrl = (output as { url: () => string }).url();
    }

    if (!resultUrl) {
      return NextResponse.json(
        { error: "Image generation failed — no output URL returned" },
        { status: 500 }
      );
    }

    // Save as asset if brandId provided
    if (brandId) {
      await prisma.asset.create({
        data: {
          userId: user.id,
          brandId,
          url: resultUrl,
          label: "Uploaded asset",
          status: "complete",
          type: "social",
          width: 1024,
          height: 1024,
          prompt,
        },
      });
    }

    return NextResponse.json({ imageUrl: resultUrl });
  } catch (error) {
    console.error("[upload-asset] Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process image: ${message}` },
      { status: 500 }
    );
  }
}
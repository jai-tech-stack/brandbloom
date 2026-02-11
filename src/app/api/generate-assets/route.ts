import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type GeneratedAsset = {
  id: string;
  url: string;
  label: string;
  type: "social" | "ad" | "thumbnail" | "banner";
  width: number;
  height: number;
};

type BrandInput = {
  name?: string;
  colors?: string[];
  description?: string;
};

const ASSET_PROMPTS = [
  { label: "Instagram post", type: "social" as const, width: 1024, height: 1024, aspect_ratio: "1:1", prompt: "Professional brand social media post, square format, modern, clean, high quality, visually appealing" },
  { label: "Open Graph", type: "social" as const, width: 1344, height: 768, aspect_ratio: "16:9", prompt: "Professional brand image for website link preview, wide format, modern, clean, eye-catching" },
  { label: "Ad creative", type: "ad" as const, width: 1152, height: 896, aspect_ratio: "4:3", prompt: "Professional ad creative, brand style, modern, high quality marketing image, compelling visuals" },
  { label: "Video thumbnail", type: "thumbnail" as const, width: 1344, height: 768, aspect_ratio: "16:9", prompt: "Engaging video thumbnail, professional, modern, eye-catching, high contrast" },
];

/**
 * Build prompt with brand context
 */
function buildImagePrompt(basePrompt: string, brand: BrandInput | null): string {
  const parts: string[] = [];
  if (brand?.name) parts.push(`Brand: ${brand.name}.`);
  if (brand?.colors?.length) parts.push(`Use these brand colors: ${brand.colors.slice(0, 3).join(", ")}.`);
  if (brand?.description) parts.push(`Context: ${brand.description.slice(0, 120)}.`);
  parts.push(basePrompt);
  parts.push("High quality, professional, modern design, 4K resolution.");
  return parts.join(" ");
}

/**
 * Generate image via Python backend (uses Gemini Nano Banana)
 */
async function generateImageWithBackend(prompt: string, sessionId: string): Promise<string | null> {
  try {
    const backendUrl = "http://localhost:8001/api/generate-image";
    console.log("[Generate] Calling backend with prompt:", prompt.substring(0, 80) + "...");
    
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, session_id: sessionId }),
    });

    if (!response.ok) {
      console.error("[Generate] Backend error:", response.status);
      return null;
    }

    const data = await response.json() as { success: boolean; image_url?: string; error?: string };
    
    if (data.success && data.image_url) {
      console.log("[Generate] SUCCESS - Got image!");
      return data.image_url;
    }
    
    console.error("[Generate] Backend returned:", data.error || "No image");
    return null;
  } catch (error) {
    console.error("[Generate] Error calling backend:", error);
    return null;
  }
}

/**
 * Asset generation API using Gemini Nano Banana via Python backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, brand, limit: limitParam, promptOverride, aspectRatio: aspectRatioParam, brandId } = body as {
      url?: string;
      brand?: BrandInput;
      limit?: number;
      promptOverride?: string;
      aspectRatio?: string;
      brandId?: string;
    };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    let userId: string | null = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      userId = user?.id ?? null;
    }

    const brandData = brand && (brand.name || (brand.colors && brand.colors.length)) ? brand : null;
    const limit = Math.min(4, Math.max(1, Number(limitParam) || 2));
    const useCustomPrompt = typeof promptOverride === "string" && promptOverride.trim().length > 0;
    const customAspect = (typeof aspectRatioParam === "string" && aspectRatioParam !== "__auto__" ? aspectRatioParam : "1:1");
    
    const specsToRun = useCustomPrompt
      ? [{ label: "Custom", type: "social" as const, width: 1024, height: 1024, aspect_ratio: customAspect, prompt: promptOverride.trim() }]
      : ASSET_PROMPTS.slice(0, limit);

    const numToGenerate = specsToRun.length;
    
    // Check credits if logged in
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.credits < numToGenerate) {
        return NextResponse.json(
          { error: `Not enough credits. You have ${user?.credits ?? 0}; need ${numToGenerate}. Sign up for 10 free credits!` },
          { status: 402 }
        );
      }
    }

    // Generate images with Python backend
    const assets: GeneratedAsset[] = [];
    
    for (let i = 0; i < specsToRun.length; i++) {
      const spec = specsToRun[i];
      const fullPrompt = buildImagePrompt(spec.prompt, brandData);
      const sessionId = `brandbloom-${Date.now()}-${i}`;
      
      console.log(`[Generate] Generating asset ${i + 1}/${specsToRun.length}: ${spec.label}`);
      
      const imageUrl = await generateImageWithBackend(fullPrompt, sessionId);
      
      if (imageUrl) {
        const id = String(i + 1);
        assets.push({
          id,
          url: imageUrl,
          label: spec.label,
          type: spec.type,
          width: spec.width,
          height: spec.height,
        });
        
        // Save to DB if logged in
        if (userId) {
          await prisma.asset.create({
            data: {
              userId,
              brandId: brandId || null,
              url: "ai-generated", // Don't store base64 in DB
              label: spec.label,
              type: spec.type,
              width: spec.width,
              height: spec.height,
              prompt: spec.prompt,
            },
          });
        }
      }
    }

    if (assets.length > 0) {
      // Deduct credits if logged in
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { decrement: assets.length } },
        });
        const updated = await prisma.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });
        return NextResponse.json({ assets, credits: updated?.credits ?? 0 });
      }
      return NextResponse.json({ assets });
    }

    // Fallback to demo mode
    console.log("[Generate] Falling back to demo mode");
    const demoSpecs = useCustomPrompt
      ? [{ label: "Custom", type: "social" as const, width: 1024, height: 1024 }]
      : ASSET_PROMPTS.slice(0, limit);
      
    const base = "https://placehold.co";
    const demoAssets: GeneratedAsset[] = demoSpecs.map((spec, i) => ({
      id: String(i + 1),
      url: `${base}/${spec.width}x${spec.height}/1c1917/ea751d?text=${encodeURIComponent(spec.label)}`,
      label: spec.label,
      type: spec.type,
      width: spec.width,
      height: spec.height,
    }));
    
    return NextResponse.json({ assets: demoAssets, demo: true });
  } catch (e) {
    console.error("generate-assets error:", e);
    return NextResponse.json({ error: "Asset generation failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { buildImagePrompt, generateImageWithReplicate } from "@/lib/ai-generator";
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
  { label: "Instagram post", type: "social" as const, width: 1024, height: 1024, aspect_ratio: "1:1", prompt: "Professional brand social media post, square format, modern, clean, high quality" },
  { label: "Open Graph", type: "social" as const, width: 1344, height: 768, aspect_ratio: "16:9", prompt: "Professional brand image for website link preview, wide format, modern, clean" },
  { label: "Ad creative", type: "ad" as const, width: 1152, height: 896, aspect_ratio: "4:3", prompt: "Professional ad creative, brand style, modern, high quality marketing image" },
  { label: "Video thumbnail", type: "thumbnail" as const, width: 1344, height: 768, aspect_ratio: "16:9", prompt: "Engaging video thumbnail, professional, modern, eye-catching" },
];

/**
 * Asset generation API (Bloom-like).
 * When logged in: checks credits, decrements per image, saves Asset(s). Returns credits in response.
 * When not logged in: no credits check; demo/real images only (no persistence).
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
      return NextResponse.json(
        { error: "Missing or invalid url" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    let userId: string | null = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      userId = user?.id ?? null;
    }

    const apiToken = (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();
    const brandData = brand && (brand.name || (brand.colors && brand.colors.length)) ? brand : null;

    const limit = Math.min(4, Math.max(1, Number(limitParam) || 2));
    const useCustomPrompt = typeof promptOverride === "string" && promptOverride.trim().length > 0;
    const customAspect = (typeof aspectRatioParam === "string" && aspectRatioParam !== "__auto__" ? aspectRatioParam : "1:1") as string;
    const specsToRun = useCustomPrompt
      ? [{ label: "Custom", type: "social" as const, width: 1024, height: 1024, aspect_ratio: customAspect, prompt: promptOverride.trim() }]
      : ASSET_PROMPTS.slice(0, limit);

    const numToGenerate = specsToRun.length;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.credits < numToGenerate) {
        return NextResponse.json(
          { error: `Not enough credits. You have ${user?.credits ?? 0}; need ${numToGenerate}. Sign in for free credits or buy more.` },
          { status: 402 }
        );
      }
    }

    if (apiToken) {
      const assets: GeneratedAsset[] = [];
      for (let i = 0; i < specsToRun.length; i++) {
        const spec = specsToRun[i];
        try {
          const fullPrompt = buildImagePrompt(spec.prompt, brandData);
          const imageUrl = await generateImageWithReplicate(
            apiToken,
            fullPrompt,
            spec.aspect_ratio
          );
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
            if (userId) {
              await prisma.asset.create({
                data: {
                  userId,
                  brandId: brandId || null,
                  url: imageUrl,
                  label: spec.label,
                  type: spec.type,
                  width: spec.width,
                  height: spec.height,
                  prompt: spec.prompt,
                },
              });
            }
          }
        } catch (err) {
          console.error(`Replicate asset ${spec.label} failed:`, err);
        }
      }
      if (assets.length > 0 && userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { decrement: assets.length } },
        });
        const updated = await prisma.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });
        const res = NextResponse.json({ assets, credits: updated?.credits ?? 0 });
        res.headers.set("X-Replicate-Token-Set", "true");
        return res;
      }
      if (assets.length > 0) {
        const res = NextResponse.json({ assets });
        res.headers.set("X-Replicate-Token-Set", "true");
        return res;
      }
    }

    // Demo mode
    const demoSpecs = useCustomPrompt
      ? [{ label: "Custom", type: "social" as const, width: 1024, height: 1024 }]
      : ASSET_PROMPTS.slice(0, Math.min(4, Math.max(1, Number(limitParam) || 2)));
    await new Promise((r) => setTimeout(r, 800));
    const base = "https://placehold.co";
    const demoAssets: GeneratedAsset[] = demoSpecs.map((spec, i) => ({
      id: String(i + 1),
      url: `${base}/${spec.width}x${spec.height}/1c1917/ea751d?text=${encodeURIComponent(spec.label)}`,
      label: spec.label,
      type: spec.type,
      width: spec.width,
      height: spec.height,
    }));
    if (userId && demoAssets.length > 0) {
      for (const a of demoAssets) {
        await prisma.asset.create({
          data: {
            userId,
            brandId: brandId || null,
            url: a.url,
            label: a.label,
            type: a.type,
            width: a.width,
            height: a.height,
          },
        });
      }
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: demoAssets.length } },
      });
      const updated = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      const res = NextResponse.json({ assets: demoAssets, demo: true, credits: updated?.credits ?? 0 });
      res.headers.set("X-Replicate-Token-Set", "false");
      return res;
    }
    const res = NextResponse.json({ assets: demoAssets, demo: true });
    res.headers.set("X-Replicate-Token-Set", "false");
    return res;
  } catch (e) {
    console.error("generate-assets error:", e);
    return NextResponse.json(
      { error: "Asset generation failed" },
      { status: 500 }
    );
  }
}

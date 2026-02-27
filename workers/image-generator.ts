/**
 * Image generation worker — deterministic flow.
 * 1. Generate background (Replicate, no text).
 * 2. Download background.
 * 3. Render composite with Canvas (headline, subtext, CTA, logo).
 * 4. Upload final PNG to S3.
 * 5. Save backgroundUrl + finalImageUrl + blueprint in DB.
 * No text from the AI image model.
 */
import "dotenv/config";
import { Worker } from "bullmq";
import { getRedis, isRedisConfigured } from "../src/lib/redis";
import { prisma } from "../src/lib/db";
import { buildBackgroundPrompt, generateImageWithReplicate } from "../src/server/services/ai-generator";
import { uploadBufferToStorage, uploadImageToStorage } from "../src/server/services/storage";
import { renderAsset, getCanvasDimensions } from "../src/lib/render/canvasRenderer";
import type { BlueprintForRender } from "../src/lib/render/canvasRenderer";

if (!isRedisConfigured()) {
  console.error("REDIS_URL not set. Exiting.");
  process.exit(1);
}

const connection = getRedis()!;
const token = (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();

export type ImageJobPayload = {
  userId: string;
  brandId: string | null;
  /** Full blueprint (preferred). If missing, built from prompt + aspectRatio. */
  blueprint?: BlueprintForRender;
  /** Legacy: used when blueprint is not provided. */
  prompt?: string;
  aspectRatio?: string;
  logoUrl?: string | null;
  label: string;
};

function normalizeBlueprint(data: ImageJobPayload): BlueprintForRender {
  if (data.blueprint?.intent) return data.blueprint;
  const aspectRatio = data.blueprint?.aspectRatio ?? data.aspectRatio ?? "1:1";
  return {
    aspectRatio,
    layout: "top-heading",
    includeLogo: !!data.logoUrl,
    ideaType: "custom",
    intent: {
      headline: "Your message",
      subtext: "",
      cta: "Learn more",
      visualDirection: data.prompt?.slice(0, 200) ?? "professional marketing background",
      toneAdjustment: "professional",
    },
  };
}

const worker = new Worker<ImageJobPayload>(
  "image-generation",
  async (job) => {
    const { userId, brandId, logoUrl, label } = job.data;
    const blueprint = normalizeBlueprint(job.data);

    if (!token) throw new Error("REPLICATE_API_TOKEN or REPLICATE_API_KEY not set");

    let brandContext: { name?: string; colors?: string[]; description?: string } | null = null;
    if (brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: brandId } });
      if (brand) {
        try {
          const colors = JSON.parse(brand.colors || "[]") as string[];
          brandContext = {
            name: brand.name,
            colors: colors.slice(0, 5),
            description: brand.description ?? undefined,
          };
        } catch {
          brandContext = { name: brand.name };
        }
      }
    }

    // 1. Generate background (no text, no logos)
    const backgroundPrompt = buildBackgroundPrompt(blueprint, brandContext);
    const backgroundReplicateUrl = await generateImageWithReplicate(
      token,
      backgroundPrompt,
      blueprint.aspectRatio
    );
    if (!backgroundReplicateUrl) throw new Error("Replicate returned no background image");

    // 2. Download background as buffer
    const bgRes = await fetch(backgroundReplicateUrl);
    if (!bgRes.ok) throw new Error("Failed to fetch background image");
    const backgroundBuffer = Buffer.from(await bgRes.arrayBuffer());

    // 3. Optionally download logo
    let logoBuffer: Buffer | null = null;
    if (blueprint.includeLogo && logoUrl) {
      try {
        const logoRes = await fetch(logoUrl);
        if (logoRes.ok) logoBuffer = Buffer.from(await logoRes.arrayBuffer());
      } catch {
        // continue without logo
      }
    }

    // 4. Render composite with Canvas
    const pngBuffer = await renderAsset({
      backgroundBuffer,
      blueprint,
      brand: brandContext ? { colors: brandContext.colors } : null,
      logoBuffer,
    });

    // 5. Upload to S3
    const prefix = `assets/${userId}`;
    const jobId = job.id ?? String(Date.now());
    const backgroundKey = `${prefix}/${jobId}-bg.png`;
    const finalKey = `${prefix}/${jobId}.png`;

    const backgroundUrl = await uploadImageToStorage(backgroundReplicateUrl, backgroundKey);
    const finalImageUrl = await uploadBufferToStorage(pngBuffer, finalKey, "image/png");
    const url = finalImageUrl ?? backgroundUrl;

    const { width, height } = getCanvasDimensions(blueprint.aspectRatio);

    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    });

    // FIX: removed `as Record<string, unknown>` cast — Prisma types the data object directly
    const asset = await prisma.asset.create({
      data: {
        userId,
        brandId,
        url,
        label,
        type: "social",
        width,
        height,
        prompt: backgroundPrompt,
        aspectRatio: blueprint.aspectRatio,
        backgroundUrl,
        finalImageUrl: finalImageUrl ?? backgroundUrl,
        blueprint: JSON.stringify(blueprint),
        ideaType: blueprint.ideaType ?? "custom",
      },
    });

    return { assetId: asset.id, url: asset.url, finalImageUrl: asset.finalImageUrl };
  },
  { connection, concurrency: 1 }
);

worker.on("completed", (job, result) => {
  console.log(`Image job ${job.id} completed:`, result);
});

worker.on("failed", (job, err) => {
  console.error(`Image job ${job?.id} failed:`, err);
});

console.log("Image generator worker started (deterministic Canvas flow).");
process.on("SIGTERM", () => worker.close());
process.on("SIGINT", () => worker.close());
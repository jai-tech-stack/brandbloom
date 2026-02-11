/**
 * Background worker — image generation (same structure as complete package).
 * Run with: npm run worker:image (requires REDIS_URL, REPLICATE_API_TOKEN).
 */
import "dotenv/config";
import { Worker } from "bullmq";
import { getRedis, isRedisConfigured } from "../src/lib/redis";
import { prisma } from "../src/lib/db";
import { buildImagePrompt, generateImageWithReplicate } from "../src/server/services/ai-generator";
import { uploadImageToStorage } from "../src/server/services/storage";

if (!isRedisConfigured()) {
  console.error("REDIS_URL not set. Exiting.");
  process.exit(1);
}

const connection = getRedis()!;
const token = (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();

const worker = new Worker<{
  userId: string;
  brandId: string | null;
  prompt: string;
  aspectRatio: string;
  label: string;
}>(
  "image-generation",
  async (job) => {
    const { userId, brandId, prompt, aspectRatio, label } = job.data;
    let brandContext = null;
    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
      });
      if (brand) {
        brandContext = {
          name: brand.name,
          colors: (JSON.parse(brand.colors || "[]") as string[]).slice(0, 3),
          description: brand.description ?? undefined,
        };
      }
    }
    const fullPrompt = buildImagePrompt(prompt, brandContext);
    const imageUrl = await generateImageWithReplicate(token, fullPrompt, aspectRatio);
    if (!imageUrl) throw new Error("Replicate returned no image");
    const key = `assets/${userId}/${job.id}.png`;
    const finalUrl = await uploadImageToStorage(imageUrl, key);
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    });
    const asset = await prisma.asset.create({
      data: {
        userId,
        brandId,
        url: finalUrl,
        label,
        type: "social",
        width: 1024,
        height: 1024,
        prompt,
      },
    });
    return { assetId: asset.id, url: asset.url };
  },
  { connection, concurrency: 1 }
);

worker.on("completed", (job, result) => {
  console.log(`Image job ${job.id} completed:`, result);
});

worker.on("failed", (job, err) => {
  console.error(`Image job ${job?.id} failed:`, err);
});

console.log("Image generator worker started.");
process.on("SIGTERM", () => worker.close());
process.on("SIGINT", () => worker.close());

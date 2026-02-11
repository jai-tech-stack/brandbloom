/**
 * Background worker — brand analysis (same structure as complete package).
 * Run with: npm run worker:brand (requires REDIS_URL).
 */
import "dotenv/config";
import { Worker } from "bullmq";
import { getRedis, isRedisConfigured } from "../src/lib/redis";
import { prisma } from "../src/lib/db";
import { scrapeBrandFromUrl } from "../src/server/services/brand-scraper";
import { analyzeBrandWithAI } from "../src/lib/ai-brand-analysis";

if (!isRedisConfigured()) {
  console.error("REDIS_URL not set. Exiting.");
  process.exit(1);
}

const connection = getRedis()!;

const worker = new Worker<{ websiteUrl: string; userId: string }>(
  "brand-analysis",
  async (job) => {
    const { websiteUrl, userId } = job.data;
    const scraped = await scrapeBrandFromUrl(websiteUrl);
    const analysis = await analyzeBrandWithAI({
      name: scraped.name,
      description: scraped.description,
      tagline: scraped.tagline,
      colors: scraped.colors,
    });
    const brand = await prisma.brand.create({
      data: {
        userId,
        siteUrl: websiteUrl,
        name: scraped.name,
        description: scraped.description || null,
        tagline: scraped.tagline || null,
        colors: JSON.stringify(scraped.colors),
        image: scraped.image,
        domain: scraped.domain,
        fonts: JSON.stringify(scraped.fonts),
        logos: JSON.stringify(scraped.logos),
        personality: analysis.personality ?? null,
        tone: analysis.tone ?? null,
      },
    });
    return { brandId: brand.id };
  },
  { connection, concurrency: 2 }
);

worker.on("completed", (job, result) => {
  console.log(`Brand job ${job.id} completed:`, result);
});

worker.on("failed", (job, err) => {
  console.error(`Brand job ${job?.id} failed:`, err);
});

console.log("Brand analyzer worker started.");
process.on("SIGTERM", () => worker.close());
process.on("SIGINT", () => worker.close());

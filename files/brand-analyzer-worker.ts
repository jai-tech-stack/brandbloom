// workers/brand-analyzer.ts

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { scrapeBrand } from '../src/server/services/brand-scraper';
import { redisConnection } from '../src/lib/redis';

const prisma = new PrismaClient();

interface BrandScraperJob {
  brandId: string;
  websiteUrl: string;
  userId: string;
}

/**
 * Worker to process brand scraping jobs
 */
const brandAnalyzerWorker = new Worker<BrandScraperJob>(
  'brand-scraper',
  async (job: Job<BrandScraperJob>) => {
    const { brandId, websiteUrl, userId } = job.data;

    console.log(`[Brand Analyzer] Processing brand: ${brandId}`);
    console.log(`[Brand Analyzer] Website: ${websiteUrl}`);

    try {
      // Update status to processing
      await prisma.brand.update({
        where: { id: brandId },
        data: { status: 'processing' },
      });

      // Update job progress
      await job.updateProgress(10);

      // Scrape the website
      console.log(`[Brand Analyzer] Starting scrape...`);
      const brandData = await scrapeBrand(websiteUrl);

      await job.updateProgress(70);

      // Update brand in database
      console.log(`[Brand Analyzer] Updating database...`);
      await prisma.brand.update({
        where: { id: brandId },
        data: {
          name: brandData.name,
          logoUrls: brandData.logoUrls,
          colors: brandData.colors as any,
          fonts: brandData.fonts as any,
          brandPersonality: brandData.brandPersonality,
          designStyle: brandData.designStyle,
          industry: brandData.industry,
          status: 'ready',
        },
      });

      await job.updateProgress(100);

      console.log(`[Brand Analyzer] Successfully processed brand: ${brandId}`);

      return {
        success: true,
        brandId,
        brandData,
      };
    } catch (error: any) {
      console.error(`[Brand Analyzer] Error processing brand ${brandId}:`, error);

      // Update brand status to failed
      await prisma.brand.update({
        where: { id: brandId },
        data: {
          status: 'failed',
        },
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 brands at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute
    },
  }
);

// Event listeners
brandAnalyzerWorker.on('completed', (job) => {
  console.log(`[Brand Analyzer] Job ${job.id} completed successfully`);
});

brandAnalyzerWorker.on('failed', (job, err) => {
  console.error(`[Brand Analyzer] Job ${job?.id} failed:`, err);
});

brandAnalyzerWorker.on('error', (err) => {
  console.error('[Brand Analyzer] Worker error:', err);
});

console.log('[Brand Analyzer] Worker started and listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Brand Analyzer] Shutting down gracefully...');
  await brandAnalyzerWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Brand Analyzer] Shutting down gracefully...');
  await brandAnalyzerWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

export default brandAnalyzerWorker;

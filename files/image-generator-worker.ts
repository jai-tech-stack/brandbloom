// workers/image-generator.ts

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { generateBrandedImage } from '../src/server/services/ai-generator';
import { uploadToR2 } from '../src/lib/storage';
import { redisConnection } from '../src/lib/redis';

const prisma = new PrismaClient();

interface ImageGeneratorJob {
  generationId: string;
  brandId: string;
  prompt: string;
  model: 'dall-e-3' | 'stable-diffusion' | 'flux';
  size: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
}

/**
 * Worker to process image generation jobs
 */
const imageGeneratorWorker = new Worker<ImageGeneratorJob>(
  'image-generator',
  async (job: Job<ImageGeneratorJob>) => {
    const { generationId, brandId, prompt, model, size, style } = job.data;

    console.log(`[Image Generator] Processing generation: ${generationId}`);
    console.log(`[Image Generator] Prompt: ${prompt}`);

    try {
      // Update status to processing
      await prisma.generation.update({
        where: { id: generationId },
        data: { status: 'processing' },
      });

      await job.updateProgress(10);

      // Get brand data
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brand) {
        throw new Error(`Brand ${brandId} not found`);
      }

      if (brand.status !== 'ready') {
        throw new Error(`Brand ${brandId} is not ready (status: ${brand.status})`);
      }

      await job.updateProgress(20);

      // Generate image
      console.log(`[Image Generator] Generating with ${model}...`);
      const result = await generateBrandedImage({
        prompt,
        brandData: {
          colors: brand.colors as any,
          fonts: brand.fonts as any,
          brandPersonality: brand.brandPersonality || undefined,
          designStyle: brand.designStyle || undefined,
          logoUrls: brand.logoUrls,
        },
        model,
        size,
        style,
      });

      await job.updateProgress(70);

      // Download and upload to R2
      console.log(`[Image Generator] Uploading to storage...`);
      const imageUrl = await downloadAndUploadToR2(
        result.imageUrl,
        generationId
      );

      await job.updateProgress(90);

      // Update generation in database
      await prisma.generation.update({
        where: { id: generationId },
        data: {
          imageUrl,
          status: 'completed',
        },
      });

      await job.updateProgress(100);

      console.log(`[Image Generator] Successfully processed generation: ${generationId}`);

      return {
        success: true,
        generationId,
        imageUrl,
      };
    } catch (error: any) {
      console.error(
        `[Image Generator] Error processing generation ${generationId}:`,
        error
      );

      // Update generation status to failed
      await prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });

      // Refund credits
      const generation = await prisma.generation.findUnique({
        where: { id: generationId },
        select: { userId: true, creditsUsed: true },
      });

      if (generation) {
        await prisma.user.update({
          where: { id: generation.userId },
          data: {
            credits: {
              increment: generation.creditsUsed,
            },
          },
        });

        await prisma.creditTransaction.create({
          data: {
            userId: generation.userId,
            amount: generation.creditsUsed,
            type: 'refund',
            description: `Refund for failed generation: ${generationId}`,
          },
        });
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process 3 generations at a time
    limiter: {
      max: 20, // Max 20 jobs
      duration: 60000, // Per minute
    },
  }
);

/**
 * Download image from URL and upload to R2
 */
async function downloadAndUploadToR2(
  imageUrl: string,
  generationId: string
): Promise<string> {
  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Upload to R2
    const key = `generations/${generationId}.png`;
    const uploadedUrl = await uploadToR2(imageBuffer, key, 'image/png');

    return uploadedUrl;
  } catch (error) {
    console.error('Error downloading/uploading image:', error);
    // If upload fails, return original URL as fallback
    return imageUrl;
  }
}

// Event listeners
imageGeneratorWorker.on('completed', (job) => {
  console.log(`[Image Generator] Job ${job.id} completed successfully`);
});

imageGeneratorWorker.on('failed', (job, err) => {
  console.error(`[Image Generator] Job ${job?.id} failed:`, err);
});

imageGeneratorWorker.on('error', (err) => {
  console.error('[Image Generator] Worker error:', err);
});

console.log('[Image Generator] Worker started and listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Image Generator] Shutting down gracefully...');
  await imageGeneratorWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Image Generator] Shutting down gracefully...');
  await imageGeneratorWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

export default imageGeneratorWorker;

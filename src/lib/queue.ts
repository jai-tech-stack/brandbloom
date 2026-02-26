/**
 * BullMQ job queues — same structure as the complete package.
 * Queues are only created when REDIS_URL is set.
 */
import { Queue } from "bullmq";
import { getRedis, isRedisConfigured } from "./redis";

const defaultJobOptions = { removeOnComplete: { count: 100 }, removeOnFail: 500 };

let _brandQueue: Queue | null = null;
let _imageQueue: Queue | null = null;

function createBrandQueue(): Queue | null {
  if (!isRedisConfigured()) return null;
  const conn = getRedis();
  if (!conn) return null;
  _brandQueue = new Queue<{
    websiteUrl: string;
    userId: string;
  }>("brand-analysis", {
    connection: conn,
    defaultJobOptions,
  });
  return _brandQueue;
}

function createImageQueue(): Queue | null {
  if (!isRedisConfigured()) return null;
  const conn = getRedis();
  if (!conn) return null;
  _imageQueue = new Queue<{
    userId: string;
    brandId: string | null;
    prompt: string;
    aspectRatio: string;
    label: string;
  }>("image-generation", {
    connection: conn,
    defaultJobOptions,
  });
  return _imageQueue;
}

export function getBrandAnalysisQueue(): Queue | null {
  return _brandQueue ?? createBrandQueue();
}

export function getImageGenerationQueue(): Queue | null {
  return _imageQueue ?? createImageQueue();
}

export type BrandAnalysisJob = {
  websiteUrl: string;
  userId: string;
};

export type ImageGenerationJob = {
  userId: string;
  brandId: string | null;
  prompt: string;
  aspectRatio: string;
  label: string;
};

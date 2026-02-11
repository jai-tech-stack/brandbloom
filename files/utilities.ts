// src/lib/redis.ts

import { Redis } from 'ioredis';

const getRedisUrl = () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not set');
  }
  return process.env.REDIS_URL;
};

export const redisConnection = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: null,
});

// src/lib/queue.ts

import { Queue } from 'bullmq';
import { redisConnection } from './redis';

// Brand scraping queue
export const brandScraperQueue = new Queue('brand-scraper', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep for 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 86400, // Keep for 24 hours
    },
  },
});

// Image generation queue
export const imageGeneratorQueue = new Queue('image-generator', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
    },
  },
});

/**
 * Add a job to a queue
 */
export async function addJob(
  queueName: 'brand-scraper' | 'image-generator',
  data: any
) {
  const queue = queueName === 'brand-scraper' ? brandScraperQueue : imageGeneratorQueue;
  
  const job = await queue.add(queueName, data, {
    jobId: `${queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });

  return job;
}

/**
 * Get job status
 */
export async function getJobStatus(
  queueName: 'brand-scraper' | 'image-generator',
  jobId: string
) {
  const queue = queueName === 'brand-scraper' ? brandScraperQueue : imageGeneratorQueue;
  const job = await queue.getJob(jobId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
  };
}

// src/lib/storage.ts

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'brand-assets';

/**
 * Upload file to R2
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return public URL
  return `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
}

/**
 * Get signed URL for private file
 */
export async function getSignedUrlForR2(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

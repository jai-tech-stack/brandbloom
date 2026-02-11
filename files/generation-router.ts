// src/server/api/routers/generation.ts

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { addJob } from '@/lib/queue';
import { validateGenerationParams } from '@/server/services/ai-generator';

export const generationRouter = createTRPCRouter({
  /**
   * Generate a new image
   */
  create: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        prompt: z.string().min(3).max(1000),
        model: z.enum(['dall-e-3', 'stable-diffusion', 'flux']).default('dall-e-3'),
        size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
        style: z.enum(['vivid', 'natural']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.userId;

      // Get brand data
      const brand = await ctx.db.brand.findFirst({
        where: {
          id: input.brandId,
          userId,
        },
      });

      if (!brand) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Brand not found',
        });
      }

      if (brand.status !== 'ready') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Brand is still being processed',
        });
      }

      // Check user credits
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits',
        });
      }

      // Validate generation params
      const validation = validateGenerationParams({
        prompt: input.prompt,
        brandData: {
          colors: brand.colors as any,
          fonts: brand.fonts as any,
          brandPersonality: brand.brandPersonality || undefined,
          designStyle: brand.designStyle || undefined,
        },
        model: input.model,
        size: input.size,
      });

      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.errors.join(', '),
        });
      }

      // Create generation record
      const generation = await ctx.db.generation.create({
        data: {
          userId,
          brandId: input.brandId,
          prompt: input.prompt,
          model: input.model,
          size: input.size,
          style: input.style,
          status: 'pending',
          creditsUsed: 1,
        },
      });

      // Deduct credits immediately
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });

      // Record transaction
      await ctx.db.creditTransaction.create({
        data: {
          userId,
          amount: -1,
          type: 'generation',
          description: `Generated image: ${input.prompt.slice(0, 50)}`,
        },
      });

      // Queue generation job
      await addJob('image-generator', {
        generationId: generation.id,
        brandId: input.brandId,
        prompt: input.prompt,
        model: input.model,
        size: input.size,
        style: input.style,
      });

      return generation;
    }),

  /**
   * Get all generations for a brand
   */
  getByBrand: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const generations = await ctx.db.generation.findMany({
        where: {
          brandId: input.brandId,
          userId: ctx.session.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined = undefined;
      if (generations.length > input.limit) {
        const nextItem = generations.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: generations,
        nextCursor,
      };
    }),

  /**
   * Get a single generation
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const generation = await ctx.db.generation.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.userId,
        },
        include: {
          brand: true,
        },
      });

      if (!generation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Generation not found',
        });
      }

      return generation;
    }),

  /**
   * Delete a generation
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const generation = await ctx.db.generation.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.userId,
        },
      });

      if (!generation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Generation not found',
        });
      }

      // TODO: Delete image from R2 storage

      await ctx.db.generation.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Regenerate an image
   */
  regenerate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const originalGeneration = await ctx.db.generation.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.userId,
        },
      });

      if (!originalGeneration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Generation not found',
        });
      }

      // Check credits
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.userId },
        select: { credits: true },
      });

      if (!user || user.credits < 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits',
        });
      }

      // Create new generation with same params
      const newGeneration = await ctx.db.generation.create({
        data: {
          userId: ctx.session.userId,
          brandId: originalGeneration.brandId,
          prompt: originalGeneration.prompt,
          model: originalGeneration.model,
          size: originalGeneration.size,
          style: originalGeneration.style,
          status: 'pending',
          creditsUsed: 1,
        },
      });

      // Deduct credits
      await ctx.db.user.update({
        where: { id: ctx.session.userId },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });

      // Record transaction
      await ctx.db.creditTransaction.create({
        data: {
          userId: ctx.session.userId,
          amount: -1,
          type: 'generation',
          description: `Regenerated: ${originalGeneration.prompt.slice(0, 50)}`,
        },
      });

      // Queue job
      await addJob('image-generator', {
        generationId: newGeneration.id,
        brandId: originalGeneration.brandId,
        prompt: originalGeneration.prompt,
        model: originalGeneration.model,
        size: originalGeneration.size,
        style: originalGeneration.style,
      });

      return newGeneration;
    }),

  /**
   * Get user's generation history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const generations = await ctx.db.generation.findMany({
        where: {
          userId: ctx.session.userId,
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              websiteUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined = undefined;
      if (generations.length > input.limit) {
        const nextItem = generations.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: generations,
        nextCursor,
      };
    }),
});

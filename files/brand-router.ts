// src/server/api/routers/brand.ts

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { scrapeBrand, isValidUrl } from '@/server/services/brand-scraper';
import { TRPCError } from '@trpc/server';
import { addJob } from '@/lib/queue';

export const brandRouter = createTRPCRouter({
  /**
   * Create a new brand by scraping a website
   */
  create: protectedProcedure
    .input(
      z.object({
        websiteUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { websiteUrl } = input;
      const userId = ctx.session.userId;

      // Validate URL
      if (!isValidUrl(websiteUrl)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid website URL',
        });
      }

      // Check if brand already exists for this user
      const existingBrand = await ctx.db.brand.findFirst({
        where: {
          userId,
          websiteUrl,
        },
      });

      if (existingBrand) {
        return existingBrand;
      }

      // Create brand record
      const brand = await ctx.db.brand.create({
        data: {
          userId,
          websiteUrl,
          status: 'processing',
          logoUrls: [],
          colors: {},
          fonts: {},
        },
      });

      // Queue scraping job
      await addJob('brand-scraper', {
        brandId: brand.id,
        websiteUrl,
        userId,
      });

      return brand;
    }),

  /**
   * Get all brands for the current user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const brands = await ctx.db.brand.findMany({
      where: {
        userId: ctx.session.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return brands;
  }),

  /**
   * Get a single brand by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.userId,
        },
        include: {
          generations: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 20,
          },
        },
      });

      if (!brand) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Brand not found',
        });
      }

      return brand;
    }),

  /**
   * Update brand manually
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        colors: z.any().optional(),
        fonts: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const brand = await ctx.db.brand.findFirst({
        where: {
          id,
          userId: ctx.session.userId,
        },
      });

      if (!brand) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Brand not found',
        });
      }

      return await ctx.db.brand.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a brand
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.userId,
        },
      });

      if (!brand) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Brand not found',
        });
      }

      await ctx.db.brand.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Re-analyze a brand
   */
  reAnalyze: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.userId,
        },
      });

      if (!brand) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Brand not found',
        });
      }

      // Update status to processing
      await ctx.db.brand.update({
        where: { id: input.id },
        data: { status: 'processing' },
      });

      // Queue scraping job
      await addJob('brand-scraper', {
        brandId: brand.id,
        websiteUrl: brand.websiteUrl,
        userId: ctx.session.userId,
      });

      return { success: true };
    }),
});

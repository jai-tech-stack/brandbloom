/**
 * Brand tRPC router — same structure as the complete package.
 * Create brand by URL (scrape + optional AI); optionally enqueue job when Redis is set.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { scrapeBrandFromUrl, isValidUrl } from "@/server/services/brand-scraper";
import { analyzeBrandWithAI } from "@/lib/ai-brand-analysis";
import { getBrandAnalysisQueue } from "@/lib/queue";

export const brandRouter = router({
  create: protectedProcedure
    .input(z.object({ websiteUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const url = input.websiteUrl.startsWith("http") ? input.websiteUrl : `https://${input.websiteUrl}`;
      if (!isValidUrl(url)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid website URL" });
      }
      const existing = await ctx.prisma.brand.findFirst({
        where: { userId: ctx.user.id, siteUrl: url },
      });
      if (existing) return existing;

      const queue = getBrandAnalysisQueue();
      if (queue) {
        const job = await queue.add("analyze", { websiteUrl: url, userId: ctx.user.id });
        return { id: job.id, status: "queued", websiteUrl: url } as { id: string; status: string; websiteUrl: string };
      }

      const scraped = await scrapeBrandFromUrl(url);
      const analysis = await analyzeBrandWithAI({
        name: scraped.name,
        description: scraped.description,
        tagline: scraped.tagline,
        colors: scraped.colors,
      });
      const brand = await ctx.prisma.brand.create({
        data: {
          userId: ctx.user.id,
          siteUrl: url,
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
      return brand;
    }),

  list: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.brand.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  getByUrl: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.brand.findFirst({
        where: { userId: ctx.user.id, siteUrl: input.url },
      });
    }),
});

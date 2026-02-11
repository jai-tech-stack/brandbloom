/**
 * Generation tRPC router — same structure as the complete package.
 * Generate image (Replicate FLUX); check credits, optionally enqueue when Redis is set.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { buildImagePrompt, generateImageWithReplicate } from "@/server/services/ai-generator";
import { getImageGenerationQueue } from "@/lib/queue";
import { uploadImageToStorage } from "@/server/services/storage";

const replicateToken = () => (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();

export const generationRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        brandId: z.string().nullable(),
        prompt: z.string().min(1),
        aspectRatio: z.string().default("1:1"),
        label: z.string().default("Custom"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } });
      if (!user || user.credits < 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not enough credits. Buy more or sign in.",
        });
      }
      const queue = getImageGenerationQueue();
      if (queue) {
        const job = await queue.add("generate", {
          userId: ctx.user.id,
          brandId: input.brandId,
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          label: input.label,
        });
        return { id: job.id, status: "queued" } as { id: string; status: string };
      }

      let brandContext = null;
      if (input.brandId) {
        const brand = await ctx.prisma.brand.findFirst({
          where: { id: input.brandId, userId: ctx.user.id },
        });
        if (brand) {
          brandContext = {
            name: brand.name,
            colors: (JSON.parse(brand.colors || "[]") as string[]).slice(0, 3),
            description: brand.description ?? undefined,
          };
        }
      }
      const token = replicateToken();
      if (!token) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Replicate API token not configured. Demo mode not available via tRPC.",
        });
      }
      const fullPrompt = buildImagePrompt(input.prompt, brandContext);
      const imageUrl = await generateImageWithReplicate(token, fullPrompt, input.aspectRatio);
      if (!imageUrl) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed" });
      }
      const key = `assets/${ctx.user.id}/${Date.now()}.png`;
      const finalUrl = await uploadImageToStorage(imageUrl, key);
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { credits: { decrement: 1 } },
      });
      const asset = await ctx.prisma.asset.create({
        data: {
          userId: ctx.user.id,
          brandId: input.brandId,
          url: finalUrl,
          label: input.label,
          type: "social",
          width: 1024,
          height: 1024,
          prompt: input.prompt,
        },
      });
      return asset;
    }),

  list: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.asset.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),
});

/**
 * Root tRPC router — merges brand and generation (same as complete package).
 */
import { router } from "./trpc";
import { brandRouter } from "./routers/brand-router";
import { generationRouter } from "./routers/generation-router";

export const appRouter = router({
  brand: brandRouter,
  generation: generationRouter,
});

export type AppRouter = typeof appRouter;

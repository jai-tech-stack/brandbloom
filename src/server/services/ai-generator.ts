/**
 * Server-side AI image generation (same logic as lib/ai-generator).
 * Used by tRPC routers and workers.
 */
export {
  buildImagePrompt,
  generateImageWithReplicate,
  type BrandContext,
} from "@/lib/ai-generator";

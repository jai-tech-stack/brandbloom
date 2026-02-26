/**
 * Server-side AI image generation (same logic as lib/ai-generator).
 * Used by tRPC routers and workers.
 */
export {
  buildImagePrompt,
  buildBackgroundPrompt,
  generateImageWithReplicate,
  type BrandContext,
  type BlueprintForBackground,
} from "@/lib/ai-generator";

/**
 * Image Execution Layer
 * Only responsibility: call image model with final prompt and aspect ratio.
 * Optional: pass logo as reference image if provided.
 */

import path from "path";
import { generateImageWithReplicate } from "@/lib/ai-generator";
import type { Blueprint } from "./blueprintFactory";

// Ensure env is loaded when running from API route
function ensureEnv() {
  const token = (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();
  if (token) return;
  try {
    const { config } = require("dotenv");
    config({ path: path.join(process.cwd(), ".env") });
  } catch {
    // dotenv not available
  }
}
ensureEnv();

const REPLICATE_TOKEN = () => (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();

export type ExecuteOptions = {
  /** Optional logo URL to pass as reference (when blueprint.includeLogo and available) */
  logoImageUrl?: string | null;
  sessionId?: string;
};

/**
 * Execute image generation. Uses blueprint aspect ratio and dimensions.
 * Logo reference: Replicate FLUX may not support image input in this path; we still pass prompt that describes logo placement.
 */
export async function executeImageGeneration(
  finalPrompt: string,
  blueprint: Blueprint,
  options: ExecuteOptions = {}
): Promise<string | null> {
  const token = REPLICATE_TOKEN();
  const sessionId = options.sessionId ?? `brandbloom-${Date.now()}`;

  if (token) {
    const url = await generateImageWithReplicate(token, finalPrompt, blueprint.aspectRatio);
    if (url) return url;
    if (process.env.NODE_ENV === "development") {
      console.warn("[ImageExecutor] Replicate returned no image.");
    }
  }

  return null;
}

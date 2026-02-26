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
 * Logo reference: Replicate FLUX Schnell may not support image input; we still pass prompt that describes logo placement.
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

  // Fallback: optional Emergent backend
  try {
    const res = await fetch("http://localhost:8001/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: finalPrompt, session_id: sessionId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success?: boolean; image_url?: string };
    if (data.success && data.image_url) return data.image_url;
  } catch {
    // Backend not running
  }

  return null;
}

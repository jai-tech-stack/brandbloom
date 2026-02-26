/**
 * AI image generator — Replicate FLUX Schnell.
 * Uses Replicate SDK when available; falls back to HTTP API.
 */

export type BrandContext = {
  name?: string;
  colors?: string[];
  description?: string;
};

/**
 * Build a prompt string from brand context and a base prompt.
 * Do NOT use for background generation — use buildBackgroundPrompt instead.
 */
export function buildImagePrompt(basePrompt: string, brand: BrandContext | null): string {
  const parts: string[] = [];
  if (brand?.name) parts.push(`Brand: ${brand.name}.`);
  if (brand?.colors?.length) parts.push(`Use these brand colors: ${brand.colors.slice(0, 3).join(", ")}.`);
  if (brand?.description) parts.push(`Context: ${brand.description.slice(0, 120)}.`);
  parts.push(basePrompt);
  return parts.join(" ");
}

/** Blueprint shape needed for background prompt (visual direction only; no headline/CTA). */
export type BlueprintForBackground = {
  aspectRatio: string;
  intent: { visualDirection?: string; toneAdjustment?: string };
};

/**
 * Build prompt for background-only image generation.
 * MUST NOT include headline, subtext, CTA, or logo placement.
 * AI must never render typography. Used by worker and deterministic flow.
 */
export function buildBackgroundPrompt(
  blueprint: BlueprintForBackground,
  brand: BrandContext | null
): string {
  const parts: string[] = [
    "Generate abstract professional marketing background.",
    "No text.",
    "No typography.",
    "No logos.",
    "No letters.",
    "Designed for text overlay.",
  ];
  if (blueprint.intent.visualDirection) {
    parts.push(`Visual style: ${blueprint.intent.visualDirection.slice(0, 200)}.`);
  }
  if (blueprint.intent.toneAdjustment) {
    parts.push(`Mood: ${blueprint.intent.toneAdjustment}.`);
  }
  parts.push(`Aspect ratio: ${blueprint.aspectRatio}.`);
  if (brand?.colors?.length) {
    parts.push(`Use these colors in the background: ${brand.colors.slice(0, 5).join(", ")}.`);
  }
  if (brand?.description) {
    parts.push(`Context: ${brand.description.slice(0, 100)}.`);
  }
  parts.push("Professional, high quality, 4K. Background only.");
  return parts.join(" ");
}

const FLUX_MODEL = "black-forest-labs/flux-schnell";

/** Extract image URL from Replicate SDK output (FileOutput or URL string). */
function urlFromOutput(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    const obj = first as { url?: string | (() => string); href?: string; uri?: string };
    const u = typeof obj?.url === "function" ? obj.url() : obj?.url ?? obj?.href ?? obj?.uri;
    if (typeof u === "string" && u.startsWith("http")) return u;
  }
  const obj = output as { url?: string | (() => string); href?: string; uri?: string };
  const u = typeof obj?.url === "function" ? obj.url() : obj?.url ?? obj?.href ?? obj?.uri;
  if (typeof u === "string" && u.startsWith("http")) return u;
  return null;
}

/**
 * Generate a single image via Replicate FLUX Schnell.
 * Prefers the official Replicate SDK; falls back to HTTP API.
 */
export async function generateImageWithReplicate(
  token: string,
  prompt: string,
  aspectRatio: string
): Promise<string | null> {
  // Prefer Replicate SDK (handles polling and output format)
  try {
    const Replicate = (await import("replicate")).default;
    const replicate = new Replicate({ auth: token });
    const input = { prompt, aspect_ratio: aspectRatio };
    const output = await replicate.run(FLUX_MODEL, { input } as { input: Record<string, unknown> });
    const url = urlFromOutput(output);
    if (url) return url;
    if (process.env.NODE_ENV === "development") {
      console.warn("[Replicate] SDK run returned no URL. Output type:", typeof output, Array.isArray(output) ? `length ${output.length}` : "");
    }
  } catch (sdkErr) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Replicate] SDK failed, trying HTTP API:", (sdkErr as Error).message);
    }
  }

  // Fallback: HTTP API
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      version: FLUX_MODEL,
      input: { prompt, aspect_ratio: aspectRatio },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Replicate] HTTP error:", res.status, err.slice(0, 400));
    return null;
  }

  const data = (await res.json()) as { status?: string; error?: string; id?: string; urls?: { get?: string }; output?: unknown };
  const urlFromData = (d: typeof data) => {
    if (d.status !== "succeeded" || d.output == null) return null;
    const out = d.output;
    if (typeof out === "string" && out.startsWith("http")) return out;
    if (Array.isArray(out) && out[0]) {
      const first = out[0];
      if (typeof first === "string" && first.startsWith("http")) return first;
      const o = first as Record<string, unknown>;
      const u = (o?.url ?? o?.href ?? o?.uri) as string | undefined;
      if (typeof u === "string") return u;
    }
    return null;
  };

  let url = urlFromData(data);
  if (url) return url;

  if (data.status === "starting" || data.status === "processing") {
    const getUrl = data.urls?.get ?? (data.id ? `https://api.replicate.com/v1/predictions/${data.id}` : null);
    if (!getUrl) return null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!getRes.ok) break;
      const next = (await getRes.json()) as typeof data;
      url = urlFromData(next);
      if (url) return url;
      if (next.status === "failed") {
        if (next.error) console.error("[Replicate] prediction failed:", next.error);
        break;
      }
      if (next.status === "canceled") break;
    }
  }
  return null;
}

/**
 * AI image generator — Replicate FLUX Schnell (extensible for DALL-E etc.).
 */

const REPLICATE_CREATE = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";
const REPLICATE_BASE = "https://api.replicate.com/v1";

export type BrandContext = {
  name?: string;
  colors?: string[];
  description?: string;
};

/**
 * Build a prompt string from brand context and a base prompt.
 */
export function buildImagePrompt(basePrompt: string, brand: BrandContext | null): string {
  const parts: string[] = [];
  if (brand?.name) parts.push(`Brand: ${brand.name}.`);
  if (brand?.colors?.length) parts.push(`Use these brand colors: ${brand.colors.slice(0, 3).join(", ")}.`);
  if (brand?.description) parts.push(`Context: ${brand.description.slice(0, 120)}.`);
  parts.push(basePrompt);
  return parts.join(" ");
}

function getOutputUrl(data: { status?: string; output?: unknown }): string | null {
  if (data.status !== "succeeded" || data.output == null) return null;
  const out = data.output;
  if (typeof out === "string" && out.startsWith("http")) return out;
  if (Array.isArray(out) && out[0]) {
    const first = out[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    const u = (first as { url?: string; href?: string })?.url ?? (first as { url?: string; href?: string })?.href;
    if (typeof u === "string") return u;
  }
  const obj = out as { url?: string; href?: string };
  if (typeof obj?.url === "string") return obj.url;
  if (typeof obj?.href === "string") return obj.href;
  return null;
}

/**
 * Generate a single image via Replicate FLUX Schnell.
 * Returns the image URL or null on failure.
 */
export async function generateImageWithReplicate(
  token: string,
  prompt: string,
  aspectRatio: string
): Promise<string | null> {
  const createRes = await fetch(REPLICATE_CREATE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: { prompt, aspect_ratio: aspectRatio },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("Replicate create error:", createRes.status, err);
    return null;
  }

  const data = (await createRes.json()) as {
    id?: string;
    status?: string;
    urls?: { get?: string };
    output?: unknown;
  };

  const url = getOutputUrl(data);
  if (url) return url;

  if (data.status === "starting" || data.status === "processing") {
    const getUrl = data.urls?.get ?? (data.id ? `${REPLICATE_BASE}/predictions/${data.id}` : null);
    if (!getUrl) return null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const getRes = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!getRes.ok) break;
      const next = (await getRes.json()) as { status?: string; output?: unknown };
      const nextUrl = getOutputUrl(next);
      if (nextUrl) return nextUrl;
      if (next.status === "failed" || next.status === "canceled") break;
    }
  }
  return null;
}

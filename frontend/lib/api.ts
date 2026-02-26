/** Brand BLOOM+ API client (trybloom.ai-style). */
const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export interface BrandProfile {
  url?: string;
  primary_colors?: string[];
  secondary_colors?: string[];
  fonts?: string[];
  style?: string;
  mood?: string[];
  logo_description?: string;
  logo_url?: string;
  [key: string]: unknown;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const d = (err as { detail?: string }).detail;
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? d.join(", ") : res.statusText || "Request failed");
  }
  return res.json();
}

export async function checkBackendHealth(): Promise<{ ok: boolean; url: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return { ok: res.ok, url: API_BASE };
  } catch {
    return { ok: false, url: API_BASE };
  }
}

export async function analyzeBrandUrl(url: string): Promise<BrandProfile> {
  return post<BrandProfile>("/api/brands/analyze", { url });
}

export async function generateLogo(brandProfile: BrandProfile) {
  return post<{ strategy?: unknown; concepts?: string[]; image_urls?: string[]; rankings?: unknown[] }>("/api/generations/logo", brandProfile);
}

export async function createAsset(params: { brand_profile: BrandProfile; asset_type?: string; dimensions?: string; copy_text?: string | null }) {
  return post<{ prompt?: string; suggested_formats?: unknown[] }>("/api/generations/asset", {
    brand_profile: params.brand_profile,
    asset_type: params.asset_type ?? "social",
    dimensions: params.dimensions ?? "1080x1080",
    copy_text: params.copy_text ?? null,
  });
}

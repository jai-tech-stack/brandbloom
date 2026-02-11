/**
 * Brand scraper — Bloom-like extraction from a website URL.
 * Fetches HTML, parses meta, colors, logos, and fonts (no AI).
 */

export type ScrapedBrand = {
  name: string;
  description: string;
  tagline: string;
  colors: string[];
  image: string | null;
  siteUrl: string;
  domain: string;
  logos: string[];
  fonts: string[];
};

/**
 * Fetches the URL and extracts brand data from HTML/CSS.
 */
export async function scrapeBrandFromUrl(url: string): Promise<ScrapedBrand> {
  const res = await fetch(url, {
    headers: { "User-Agent": "BrandBloom/1.0 (brand extraction)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return extractBrandFromHtml(html, url);
}

function extractBrandFromHtml(html: string, siteUrl: string): ScrapedBrand {
  const parsed = new URL(siteUrl);
  const domain = parsed.hostname.replace(/^www\./, "");
  const name = getMeta(html, "og:title") || getMeta(html, "title") || domain || "Brand";
  const description = getMeta(html, "og:description") || getMeta(html, "description") || "";
  const tagline = getMeta(html, "og:tagline") || getFirstHeading(html) || "";
  const themeColor = getMeta(html, "theme-color");
  const ogImage = getMeta(html, "og:image");
  const colors = extractColors(html);
  if (themeColor && !colors.includes(normalizeHex(themeColor))) colors.unshift(normalizeHex(themeColor));
  const image = ogImage ? (ogImage.startsWith("http") ? ogImage : new URL(ogImage, siteUrl).href) : null;
  const logos = extractLogos(html, siteUrl);
  const fonts = extractFonts(html);

  return {
    name: name.trim() || "Brand",
    description: description.trim(),
    tagline: tagline.trim(),
    colors: colors.slice(0, 5),
    image,
    siteUrl,
    domain,
    logos,
    fonts,
  };
}

function getMeta(html: string, key: string): string | null {
  const keyLower = key.toLowerCase();
  if (keyLower === "title") {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? stripTags(m[1]).trim() : null;
  }
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${keyLower.replace(/^og:/, "")}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${keyLower.replace(/^og:/, "")}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function getFirstHeading(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]).trim().slice(0, 120) : null;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

const HEX_RE = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
function extractColors(html: string): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  let m: RegExpExecArray | null;
  HEX_RE.lastIndex = 0;
  while ((m = HEX_RE.exec(html)) !== null) {
    const hex = normalizeHex("#" + m[1]);
    if (!seen.has(hex)) {
      seen.add(hex);
      list.push(hex);
    }
  }
  return list;
}

function normalizeHex(s: string): string {
  const hex = s.replace(/^#/, "").trim();
  if (hex.length === 3) return "#" + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return "#" + hex.slice(0, 6);
}

/** Find logo image URLs: img with logo in src/alt, or common paths. */
function extractLogos(html: string, siteUrl: string): string[] {
  const base = new URL(siteUrl);
  const seen = new Set<string>();
  const out: string[] = [];

  // <img src="..." alt="...">
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let match: RegExpExecArray | null;
  imgRe.lastIndex = 0;
  while ((match = imgRe.exec(html)) !== null) {
    const src = match[1].trim();
    const alt = (match[2] || "").toLowerCase();
    const srcLower = src.toLowerCase();
    if (alt.includes("logo") || srcLower.includes("logo")) {
      const full = src.startsWith("http") ? src : new URL(src, base).href;
      if (!seen.has(full)) {
        seen.add(full);
        out.push(full);
      }
    }
  }

  // Common logo paths from link href or script
  const logoPathRe = /(?:href|src)=["']([^"']*(?:logo|brand|icon)[^"']*\.(?:png|svg|webp|jpg|jpeg))["']/gi;
  logoPathRe.lastIndex = 0;
  while ((match = logoPathRe.exec(html)) !== null) {
    const src = match[1].trim();
    const full = src.startsWith("http") ? src : new URL(src, base).href;
    if (!seen.has(full)) {
      seen.add(full);
      out.push(full);
    }
  }

  return out.slice(0, 5);
}

/** Extract font names: Google Fonts link family= param and font-family in styles. */
function extractFonts(html: string): string[] {
  const seen = new Set<string>();

  // Google Fonts: ...?family=Inter|Roboto
  const gfRe = /fonts\.googleapis\.com[^"']*[\?&]family=([^&"'\s]+)/gi;
  let m: RegExpExecArray | null;
  gfRe.lastIndex = 0;
  while ((m = gfRe.exec(html)) !== null) {
    const part = m[1].replace(/\+/g, " ").trim();
    part.split("|").forEach((name) => {
      const n = name.trim().slice(0, 60);
      if (n && !seen.has(n)) {
        seen.add(n);
      }
    });
  }

  // font-family in style attributes or inline <style>
  const ffRe = /font-family\s*:\s*([^;}"']+)/gi;
  ffRe.lastIndex = 0;
  while ((m = ffRe.exec(html)) !== null) {
    const raw = m[1].trim();
    const names = raw.split(",").map((s) => s.replace(/^['"]|['"]$/g, "").trim()).filter(Boolean);
    names.forEach((name) => {
      const n = name.slice(0, 60);
      if (n && !seen.has(n)) seen.add(n);
    });
  }

  return Array.from(seen).slice(0, 8);
}

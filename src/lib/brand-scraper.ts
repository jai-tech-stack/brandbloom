/**
 * Brand scraper — Bloom-like extraction from a website URL.
 * Fetches HTML, parses meta, colors, logos, and fonts (no AI).
 */

/** Parsed JSON-LD Organization/WebSite for deep extraction. */
export type JsonLdBrand = {
  name?: string;
  description?: string;
  url?: string;
  sameAs?: string[];
};

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
  socialAccounts: string[];
  /** Visible page text for deep LLM analysis (first ~2500 chars). */
  pageTextExcerpt?: string;
  /** Meta keywords from the page. */
  metaKeywords?: string[];
  /** Structured data from JSON-LD (Organization, WebSite). */
  jsonLd?: JsonLdBrand;
};

/**
 * Fetches the URL and extracts brand data from HTML/CSS.
 * If the page links to Elementor stylesheets, fetches them too so global color variables are detected.
 */
export async function scrapeBrandFromUrl(url: string): Promise<ScrapedBrand> {
  const res = await fetch(url, {
    headers: { "User-Agent": "BrandBloom/1.0 (brand extraction)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const base = new URL(url);
  let combined = html;
  const linkRe = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']?stylesheet["']?[^>]*>|<link[^>]+rel=["']?stylesheet["']?[^>]+href=["']([^"']+)["']/gi;
  const elementorHrefs: string[] = [];
  const themeHrefs: string[] = [];
  let linkMatch: RegExpExecArray | null;
  linkRe.lastIndex = 0;
  while ((linkMatch = linkRe.exec(html)) !== null) {
    const href = (linkMatch[1] || linkMatch[2] || "").trim();
    if (!href) continue;
    const lower = href.toLowerCase();
    if (lower.includes("elementor") && !elementorHrefs.includes(href)) elementorHrefs.push(href);
    if (
      (lower.includes("style.css") || lower.includes("theme") || lower.includes("main.css") || lower.includes("wp-content/themes")) &&
      !themeHrefs.includes(href) &&
      !lower.includes("elementor")
    ) {
      themeHrefs.push(href);
    }
  }
  const toFetch = elementorHrefs.length > 0 ? elementorHrefs.slice(0, 2) : themeHrefs.slice(0, 1);
  for (const href of toFetch) {
    try {
      const cssUrl = href.startsWith("http") ? href : new URL(href, base).href;
      const cssRes = await fetch(cssUrl, {
        headers: { "User-Agent": "BrandBloom/1.0 (brand extraction)" },
        signal: AbortSignal.timeout(5000),
      });
      if (cssRes.ok) combined += "\n" + (await cssRes.text());
    } catch {
      // ignore failed stylesheet fetch
    }
  }
  return extractBrandFromHtml(combined, url);
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
  const socialAccounts = extractSocialAccounts(html, siteUrl);
  const pageTextExcerpt = extractPageTextExcerpt(html);
  const metaKeywords = extractMetaKeywords(html);
  const jsonLd = extractJsonLd(html);

  return {
    name: name.trim() || "Brand",
    description: description.trim(),
    tagline: tagline.trim(),
    colors: colors.slice(0, 6),
    image,
    siteUrl,
    domain,
    logos,
    fonts,
    socialAccounts,
    pageTextExcerpt: pageTextExcerpt || undefined,
    metaKeywords: metaKeywords.length ? metaKeywords : undefined,
    jsonLd: jsonLd && (jsonLd.name || jsonLd.description || (jsonLd.sameAs && jsonLd.sameAs.length)) ? jsonLd : undefined,
  };
}

const PAGE_TEXT_MAX = 2800;

/** Extract visible body text for deep LLM analysis (strip scripts, normalize whitespace). */
function extractPageTextExcerpt(html: string): string {
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  const bodyMatch = noScript.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : noScript;
  const text = stripTags(content)
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, PAGE_TEXT_MAX);
}

/** Extract meta keywords as array (comma- or comma+space-separated). */
function extractMetaKeywords(html: string): string[] {
  const raw = getMeta(html, "keywords");
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 80)
    .slice(0, 20);
}

/** Extract JSON-LD Organization or WebSite for name, description, sameAs. */
function extractJsonLd(html: string): JsonLdBrand | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(html)) !== null) {
    try {
      const json = JSON.parse(m[1].trim()) as Record<string, unknown>;
      const obj = (json["@graph"] as Record<string, unknown>[])?.[0] ?? json;
      const type = (obj["@type"] as string) ?? "";
      if (type !== "Organization" && type !== "WebSite") continue;
      const name = typeof obj.name === "string" ? obj.name : undefined;
      const description = typeof obj.description === "string" ? obj.description : undefined;
      const url = typeof obj.url === "string" ? obj.url : undefined;
      let sameAs: string[] = [];
      if (Array.isArray(obj.sameAs)) {
        sameAs = obj.sameAs.filter((u): u is string => typeof u === "string").slice(0, 15);
      }
      return { name, description, url, sameAs: sameAs.length ? sameAs : undefined };
    } catch {
      continue;
    }
  }
  return null;
}

/** Extract social profile URLs from links and meta (TryBloom: "social accounts" in brand kit). */
function extractSocialAccounts(html: string, siteUrl: string): string[] {
  const base = new URL(siteUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  const patterns = [
    /(?:href|content)=["'](https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/[^"']*)["']/gi,
    /(?:href|content)=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"']*)["']/gi,
    /(?:href|content)=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"']*)["']/gi,
    /(?:href|content)=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"']*)["']/gi,
    /(?:href|content)=["'](https?:\/\/(?:www\.)?(?:youtube|youtu\.be)\/[^"']*)["']/gi,
    /(?:href|content)=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"']*)["']/gi,
    /(?:href|content)=["'](https?:\/\/(?:www\.)?pinterest\.com\/[^"']*)["']/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      try {
        const url = m[1].trim();
        const normalized = new URL(url).href;
        if (!seen.has(normalized)) {
          seen.add(normalized);
          out.push(normalized);
        }
      } catch {
        // invalid URL
      }
    }
  }
  return out.slice(0, 10);
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

/** Elementor / global CSS variable names in priority order (primary brand colors first). */
const ELEMENTOR_COLOR_ORDER = [
  "primary",
  "secondary",
  "text",
  "accent",
  "heading",
  "border",
  "background",
];

/** WordPress Gutenberg preset color slugs in priority order. */
const WP_COLOR_ORDER = ["primary", "secondary", "accent", "base", "contrast", "foreground", "background"];

/** Bootstrap theme color names in order. */
const BS_COLOR_ORDER = ["primary", "secondary", "success", "info", "warning", "danger", "light", "dark"];

/** Extract colors from CSS custom properties (e.g. Elementor --e-global-color-primary: #1C4432). */
function extractElementorColors(html: string): string[] {
  const byName: Record<string, string> = {};
  const varRe = /--e-global-color-([a-z0-9]+)\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  let m: RegExpExecArray | null;
  varRe.lastIndex = 0;
  while ((m = varRe.exec(html)) !== null) {
    const name = m[1];
    const hex = normalizeHex("#" + m[2]);
    if (!byName[name]) byName[name] = hex;
  }
  if (Object.keys(byName).length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of ELEMENTOR_COLOR_ORDER) {
    const hex = byName[name];
    if (hex && !seen.has(hex.toLowerCase())) {
      seen.add(hex.toLowerCase());
      result.push(hex);
    }
  }
  for (const name of Object.keys(byName).sort()) {
    if (ELEMENTOR_COLOR_ORDER.includes(name)) continue;
    const hex = byName[name];
    if (hex && !seen.has(hex.toLowerCase()) && result.length < 8) {
      seen.add(hex.toLowerCase());
      result.push(hex);
    }
  }
  return result;
}

/** Extract colors from WordPress Gutenberg (theme.json) --wp--preset--color--*: #hex. */
function extractWordPressColors(html: string): string[] {
  const bySlug: Record<string, string> = {};
  const varRe = /--wp--preset--color--([a-z0-9-]+)\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  let m: RegExpExecArray | null;
  varRe.lastIndex = 0;
  while ((m = varRe.exec(html)) !== null) {
    const slug = m[1];
    const hex = normalizeHex("#" + m[2]);
    if (!bySlug[slug]) bySlug[slug] = hex;
  }
  if (Object.keys(bySlug).length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const slug of WP_COLOR_ORDER) {
    const hex = bySlug[slug];
    if (hex && !seen.has(hex.toLowerCase())) {
      seen.add(hex.toLowerCase());
      result.push(hex);
    }
  }
  for (const slug of Object.keys(bySlug).sort()) {
    if (WP_COLOR_ORDER.includes(slug)) continue;
    const hex = bySlug[slug];
    if (hex && !seen.has(hex.toLowerCase()) && result.length < 8) {
      seen.add(hex.toLowerCase());
      result.push(hex);
    }
  }
  return result;
}

/** Extract colors from Bootstrap 5 --bs-primary, --bs-secondary, etc. */
function extractBootstrapColors(html: string): string[] {
  const byName: Record<string, string> = {};
  const varRe = /--bs-(primary|secondary|success|info|warning|danger|light|dark)\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  let m: RegExpExecArray | null;
  varRe.lastIndex = 0;
  while ((m = varRe.exec(html)) !== null) {
    const name = m[1];
    const hex = normalizeHex("#" + m[2]);
    if (!byName[name]) byName[name] = hex;
  }
  if (Object.keys(byName).length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of BS_COLOR_ORDER) {
    const hex = byName[name];
    if (hex && !seen.has(hex.toLowerCase())) {
      seen.add(hex.toLowerCase());
      result.push(hex);
    }
  }
  return result;
}

/** Generic theme/design system variables: --primary, --color-primary, --brand-primary, etc. */
function extractGenericThemeColors(html: string): string[] {
  const found: { name: string; hex: string }[] = [];
  const patterns = [
    /--(?:color-)?(primary|secondary|accent|brand)(?:-color)?\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
    /--(primary|secondary|accent)-color\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
    /--theme-(primary|secondary|accent)\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
    /--brand-(primary|secondary|accent)\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
    /--(?:site|app)-(primary|secondary)\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
  ];
  const nameOrder = ["primary", "secondary", "accent", "brand"];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const name = m[1];
      const hex = normalizeHex("#" + m[2]);
      if (!found.some((f) => f.hex.toLowerCase() === hex.toLowerCase())) {
        found.push({ name, hex });
      }
    }
  }
  const ordered = nameOrder.flatMap((n) => found.filter((f) => f.name === n));
  const rest = found.filter((f) => !nameOrder.includes(f.name));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const { hex } of [...ordered, ...rest]) {
    if (!seen.has(hex.toLowerCase()) && result.length < 6) {
      seen.add(hex.toLowerCase());
      result.push(hex);
    }
  }
  return result;
}

/** All framework/theme color extractors in priority order (first match wins for ordering). */
function extractFrameworkColors(html: string): string[] {
  const elementor = extractElementorColors(html);
  if (elementor.length > 0) return elementor;
  const wp = extractWordPressColors(html);
  if (wp.length > 0) return wp;
  const bs = extractBootstrapColors(html);
  if (bs.length > 0) return bs;
  const generic = extractGenericThemeColors(html);
  if (generic.length > 0) return generic;
  return [];
}

function extractColors(html: string): string[] {
  const framework = extractFrameworkColors(html);
  const seen = new Set<string>(framework.map((h) => h.toLowerCase()));
  const list: string[] = [...framework];
  let m: RegExpExecArray | null;
  HEX_RE.lastIndex = 0;
  while ((m = HEX_RE.exec(html)) !== null) {
    const hex = normalizeHex("#" + m[1]);
    const key = hex.toLowerCase();
    if (!seen.has(key) && list.length < 8) {
      seen.add(key);
      list.push(hex);
    }
  }
  return list.slice(0, 8);
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

/** Extract font names: Google Fonts, font-family in CSS, @font-face. */
function extractFonts(html: string): string[] {
  const seen = new Set<string>();

  // Google Fonts: fonts.googleapis.com or fonts.google.com ...?family=Inter|Roboto
  const gfRe = /fonts\.google(?:apis)?\.com[^"']*[\?&]family=([^&"'\s]+)/gi;
  let m: RegExpExecArray | null;
  gfRe.lastIndex = 0;
  while ((m = gfRe.exec(html)) !== null) {
    const part = m[1].replace(/\+/g, " ").trim();
    part.split("|").forEach((name) => {
      const n = name.trim().slice(0, 60);
      if (n && !seen.has(n)) seen.add(n);
    });
  }

  // @font-face { font-family: "Name" } or font-family: Name
  const fontFaceRe = /@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'"};]+)['"]?/gi;
  fontFaceRe.lastIndex = 0;
  while ((m = fontFaceRe.exec(html)) !== null) {
    const n = m[1].trim().slice(0, 60);
    if (n && !seen.has(n)) seen.add(n);
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

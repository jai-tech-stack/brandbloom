/**
 * Composite Renderer — deterministic text overlay and logo placement.
 * 1. Render background
 * 2. Overlay headline, subtext, CTA (programmatic typography)
 * 3. Place logo at exact coordinates
 * 4. Apply brand fonts and colors
 * 5. Export final PNG
 * Text must NOT come from image model.
 * Uses render/layoutToHtml (pure HTML) so react-dom/server is never in the API route bundle.
 */

import { renderLayoutToHtml } from "@/lib/render/layoutToHtml";
import type { Blueprint } from "@/lib/generation/blueprintFactory";

export type BrandForComposite = {
  colors?: string[];
  fonts?: string[];
};

export type RenderCompositeInput = {
  backgroundUrl: string;
  blueprint: Blueprint;
  brand: BrandForComposite | null;
  logoUrl?: string | null;
};

/**
 * Render composite: background + layout + overlay text + logo.
 * Returns PNG buffer or null if export fails (e.g. Puppeteer not installed).
 */
export async function renderComposite(
  input: RenderCompositeInput
): Promise<Buffer | null> {
  const { backgroundUrl, blueprint, brand, logoUrl } = input;
  const { width, height } = blueprint;
  const intent = blueprint.intent;

  const layoutProps = {
    width,
    height,
    backgroundUrl,
    headline: intent.headline ?? "",
    subtext: intent.subtext ?? null,
    cta: intent.cta ?? null,
    logoUrl: blueprint.includeLogo ? logoUrl ?? null : null,
    brandColors: brand?.colors ?? undefined,
    fontFamily: brand?.fonts?.[0] ? `"${brand.fonts[0]}", system-ui, sans-serif` : undefined,
    fontFamilyHeadline: brand?.fonts?.[0] ? `"${brand.fonts[0]}", system-ui, sans-serif` : undefined,
    layout: blueprint.layout,
  };

  const { html, width: w, height: h } = renderLayoutToHtml(layoutProps);
  return exportHtmlToPng(html, w, h);
}

/**
 * Export HTML to PNG buffer. Uses Puppeteer if available (optional dependency).
 * Returns null if Puppeteer is not installed or screenshot fails.
 */
async function exportHtmlToPng(
  html: string,
  width: number,
  height: number
): Promise<Buffer | null> {
  try {
    const mod = "puppeteer";
    const pm = await import(/* webpackIgnore: true */ mod).catch(() => null);
    if (pm == null || pm.default == null) return null; // no type assertion - Turbopack parse-safe
    const browser = await pm.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: "networkidle0" });
      const buffer = await page.screenshot({
        type: "png",
        omitBackground: false,
      });
      return Buffer.isBuffer(buffer) ? buffer : null;
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}

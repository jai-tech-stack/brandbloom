/**
 * Export composite: render layout HTML to PNG.
 * Uses Puppeteer if available; otherwise returns null (caller uses background-only as final).
 */

import type { LayoutTemplateResult } from "./types";

/**
 * Render HTML to PNG buffer. Requires puppeteer (optional dependency).
 * Returns null if puppeteer is not installed or screenshot fails.
 */
export async function exportHtmlToPng(
  result: LayoutTemplateResult
): Promise<Buffer | null> {
  try {
    // Optional dependency: use variable so TS doesn't require puppeteer types at build time
    const mod = "puppeteer";
    const puppeteer = await import(/* webpackIgnore: true */ mod).catch(() => null) as {
      default: { launch: (opts: { headless: boolean; args: string[] }) => Promise<{ newPage: () => Promise<{ setViewport: (o: unknown) => Promise<void>; setContent: (h: string, o: unknown) => Promise<void>; screenshot: (o: unknown) => Promise<Buffer | string>; }; close: () => Promise<void> }> };
    } | null;
    if (!puppeteer?.default) return null;
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({
        width: result.width,
        height: result.height,
        deviceScaleFactor: 1,
      });
      await page.setContent(result.html, { waitUntil: "networkidle0" });
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

/**
 * Top-heading layout: headline at top, safe margins, subtext and CTA below, optional logo corner.
 * Deterministic: no AI, fixed spacing and typography.
 */

import type { LayoutInput, LayoutTemplateResult } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTopHeading(input: LayoutInput): LayoutTemplateResult {
  const { width, height, backgroundUrl, headline, subtext, cta, logoUrl, brandColors } = input;
  const primary = brandColors?.[0] ?? "#111111";
  const accent = brandColors?.[1] ?? "#2563eb";

  const marginPct = 6;
  const marginX = (width * marginPct) / 100;
  const marginY = (height * marginPct) / 100;
  const headlineSize = Math.round(Math.min(width, height) * 0.08);
  const subtextSize = Math.round(headlineSize * 0.5);
  const ctaSize = Math.round(headlineSize * 0.45);
  const logoSize = Math.round(Math.min(width, height) * 0.12);

  const logoImg = logoUrl
    ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />`
    : "";
  const subtextEl = subtext ? `<p class="subtext">${escapeHtml(subtext)}</p>` : "";
  const ctaEl = cta ? `<span class="cta">${escapeHtml(cta)}</span>` : "";

  const html =
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>" +
    "*{margin:0;padding:0;box-sizing:border-box}" +
    "body{width:" + width + "px;height:" + height + "px;overflow:hidden;font-family:system-ui,sans-serif}" +
    ".root{position:relative;width:100%;height:100%;background:url('" + escapeHtml(backgroundUrl) + "') center/cover no-repeat;" +
    "display:flex;flex-direction:column;justify-content:flex-start;align-items:center;padding:" + marginY + "px " + marginX + "px}" +
    ".logo{position:absolute;top:" + marginY + "px;right:" + marginX + "px;width:" + logoSize + "px;height:" + logoSize + "px;object-fit:contain}" +
    ".headline{color:" + primary + ";font-size:" + headlineSize + "px;font-weight:700;text-align:center;line-height:1.2;max-width:100%;word-wrap:break-word;text-shadow:0 1px 2px rgba(0,0,0,0.3)}" +
    ".subtext{color:" + primary + ";font-size:" + subtextSize + "px;text-align:center;margin-top:" + Math.round(marginY * 0.8) + "px;opacity:0.95;max-width:90%}" +
    ".cta{display:inline-block;margin-top:" + marginY + "px;padding:12px 24px;background:" + accent + ";color:white;font-size:" + ctaSize + "px;font-weight:600;text-decoration:none;border-radius:8px}" +
    "</style></head><body><div class=\"root\">" + logoImg + "<h1 class=\"headline\">" + escapeHtml(headline) + "</h1>" + subtextEl + ctaEl + "</div></body></html>";

  return { html, width, height };
}

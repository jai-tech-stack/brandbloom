/**
 * Pure HTML layout rendering — no React, no react-dom/server.
 * Used by compositeRenderer so the API route bundle never imports react-dom/server.
 * Output matches the React layout components for Puppeteer screenshot.
 */

import type { LayoutProps } from "@/lib/layouts/types";

function esc(url: string): string {
  return url.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function squareTopHeadingHtml(p: LayoutProps): string {
  const MARGIN_PCT = 6;
  const { width, height, backgroundUrl, headline, subtext, cta, logoUrl, brandColors = [], fontFamily = "system-ui", fontFamilyHeadline } = p;
  const marginX = (width * MARGIN_PCT) / 100;
  const marginY = (height * MARGIN_PCT) / 100;
  const headlineSize = Math.round(Math.min(width, height) * 0.08);
  const subtextSize = Math.round(headlineSize * 0.5);
  const ctaSize = Math.round(headlineSize * 0.45);
  const logoSize = Math.round(Math.min(width, height) * 0.12);
  const primary = brandColors[0] ?? "#111111";
  const accent = brandColors[1] ?? "#2563eb";
  const headlineFont = fontFamilyHeadline ?? fontFamily;
  const bg = "url(\"" + esc(backgroundUrl) + "\") center/cover no-repeat";
  const style = `position:relative;width:${width}px;height:${height}px;margin:0;overflow:hidden;font-family:${escapeHtml(fontFamily)};background:${bg};display:flex;flex-direction:column;justify-content:flex-start;align-items:center;padding:${marginY}px ${marginX}px`;
  const logoImg = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" style="position:absolute;top:${marginY}px;right:${marginX}px;width:${logoSize}px;height:${logoSize}px;object-fit:contain" />` : "";
  const h1Style = `color:${primary};font-size:${headlineSize}px;font-weight:700;text-align:center;line-height:1.2;max-width:100%;word-wrap:break-word;text-shadow:0 1px 2px rgba(0,0,0,0.3);font-family:${escapeHtml(headlineFont)};margin:0`;
  const subtextEl = subtext ? `<p style="color:${primary};font-size:${subtextSize}px;text-align:center;margin-top:${marginY * 0.8}px;opacity:0.95;max-width:90%;margin-bottom:0">${escapeHtml(subtext)}</p>` : "";
  const ctaEl = cta ? `<span style="display:inline-block;margin-top:${marginY}px;padding:12px 24px;background:${accent};color:#fff;font-size:${ctaSize}px;font-weight:600;border-radius:8px">${escapeHtml(cta)}</span>` : "";
  return `<div style="${style}">${logoImg}<h1 style="${h1Style}">${escapeHtml(headline)}</h1>${subtextEl}${ctaEl}</div>`;
}

function splitLeftTextHtml(p: LayoutProps): string {
  const MARGIN_PCT = 5;
  const SPLIT_RATIO = 0.45;
  const { width, height, backgroundUrl, headline, subtext, cta, logoUrl, brandColors = [], fontFamily = "system-ui", fontFamilyHeadline } = p;
  const margin = (Math.min(width, height) * MARGIN_PCT) / 100;
  const leftW = width * SPLIT_RATIO;
  const headlineSize = Math.round(Math.min(width, height) * 0.065);
  const subtextSize = Math.round(headlineSize * 0.55);
  const ctaSize = Math.round(headlineSize * 0.5);
  const logoSize = Math.round(Math.min(width, height) * 0.1);
  const primary = brandColors[0] ?? "#111111";
  const accent = brandColors[1] ?? "#2563eb";
  const headlineFont = fontFamilyHeadline ?? fontFamily;
  const bg = "url(\"" + esc(backgroundUrl) + "\") left center/cover no-repeat";
  const bgRight = "url(\"" + esc(backgroundUrl) + "\") right center/cover no-repeat";
  const logoImg = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" style="position:absolute;top:${margin}px;left:${margin}px;width:${logoSize}px;height:${logoSize}px;object-fit:contain" />` : "";
  const mtLogo = logoUrl ? logoSize + margin : 0;
  const leftDiv = `<div style="width:${leftW}px;height:100%;background:${bg};display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:${margin}px">${logoImg}<h1 style="color:${primary};font-size:${headlineSize}px;font-weight:700;text-align:left;line-height:1.2;max-width:100%;word-wrap:break-word;text-shadow:0 1px 2px rgba(0,0,0,0.3);font-family:${escapeHtml(headlineFont)};margin:0;margin-top:${mtLogo}px">${escapeHtml(headline)}</h1>${subtext ? `<p style="color:${primary};font-size:${subtextSize}px;text-align:left;margin-top:${margin * 0.8}px;opacity:0.95;max-width:95%;margin-bottom:0">${escapeHtml(subtext)}</p>` : ""}${cta ? `<span style="display:inline-block;margin-top:${margin}px;padding:10px 20px;background:${accent};color:#fff;font-size:${ctaSize}px;font-weight:600;border-radius:8px">${escapeHtml(cta)}</span>` : ""}</div>`;
  const rightDiv = `<div style="flex:1;height:100%;background:${bgRight}"></div>`;
  return `<div style="position:relative;width:${width}px;height:${height}px;margin:0;padding:0;overflow:hidden;font-family:${escapeHtml(fontFamily)};display:flex;flex-direction:row;align-items:stretch">${leftDiv}${rightDiv}</div>`;
}

function verticalStoryCenteredHtml(p: LayoutProps): string {
  const MARGIN_PCT = 8;
  const { width, height, backgroundUrl, headline, subtext, cta, logoUrl, brandColors = [], fontFamily = "system-ui, -apple-system, sans-serif", fontFamilyHeadline } = p;
  const margin = (Math.min(width, height) * MARGIN_PCT) / 100;
  const headlineSize = Math.round(Math.min(width, height) * 0.07);
  const subtextSize = Math.round(headlineSize * 0.5);
  const ctaSize = Math.round(headlineSize * 0.45);
  const logoSize = Math.round(Math.min(width, height) * 0.1);
  const primary = brandColors[0] ?? "#111111";
  const accent = brandColors[1] ?? "#2563eb";
  const headlineFont = fontFamilyHeadline ?? fontFamily;
  const bg = "url(\"" + esc(backgroundUrl) + "\") center/cover no-repeat";
  const logoImg = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" style="position:absolute;top:${margin}px;left:50%;transform:translateX(-50%);width:${logoSize}px;height:${logoSize}px;object-fit:contain" />` : "";
  return `<div style="position:relative;width:${width}px;height:${height}px;margin:0;overflow:hidden;font-family:${escapeHtml(fontFamily)};background:${bg};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:${margin}px">${logoImg}<h1 style="color:${primary};font-size:${headlineSize}px;font-weight:700;text-align:center;line-height:1.2;max-width:90%;word-wrap:break-word;text-shadow:0 1px 2px rgba(0,0,0,0.3);font-family:${escapeHtml(headlineFont)};margin:0">${escapeHtml(headline)}</h1>${subtext ? `<p style="color:${primary};font-size:${subtextSize}px;text-align:center;margin-top:${margin * 0.8}px;opacity:0.95;max-width:85%;margin-bottom:0">${escapeHtml(subtext)}</p>` : ""}${cta ? `<span style="display:inline-block;margin-top:${margin}px;padding:12px 24px;background:${accent};color:#fff;font-size:${ctaSize}px;font-weight:600;border-radius:8px">${escapeHtml(cta)}</span>` : ""}</div>`;
}

function productHeroHtml(p: LayoutProps): string {
  const MARGIN_PCT = 6;
  const { width, height, backgroundUrl, headline, subtext, cta, logoUrl, brandColors = [], fontFamily = "system-ui, -apple-system, sans-serif", fontFamilyHeadline } = p;
  const marginX = (width * MARGIN_PCT) / 100;
  const marginY = (height * MARGIN_PCT) / 100;
  const headlineSize = Math.round(Math.min(width, height) * 0.09);
  const subtextSize = Math.round(headlineSize * 0.45);
  const ctaSize = Math.round(headlineSize * 0.5);
  const logoSize = Math.round(Math.min(width, height) * 0.11);
  const primary = brandColors[0] ?? "#111111";
  const accent = brandColors[1] ?? "#2563eb";
  const headlineFont = fontFamilyHeadline ?? fontFamily;
  const bg = "url(\"" + esc(backgroundUrl) + "\") center/cover no-repeat";
  const paddingBottom = marginY + logoSize + 8;
  const logoImg = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" style="position:absolute;bottom:${marginY}px;right:${marginX}px;width:${logoSize}px;height:${logoSize}px;object-fit:contain" />` : "";
  const h1MarginBottom = subtext ? marginY * 0.5 : marginY;
  return `<div style="position:relative;width:${width}px;height:${height}px;margin:0;overflow:hidden;font-family:${escapeHtml(fontFamily)};background:${bg};display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding:${marginY}px;padding-bottom:${paddingBottom}px">${logoImg}<h1 style="color:${primary};font-size:${headlineSize}px;font-weight:800;text-align:center;line-height:1.15;max-width:95%;word-wrap:break-word;text-shadow:0 2px 4px rgba(0,0,0,0.4);font-family:${escapeHtml(headlineFont)};margin:0;margin-bottom:${h1MarginBottom}px">${escapeHtml(headline)}</h1>${subtext ? `<p style="color:${primary};font-size:${subtextSize}px;text-align:center;opacity:0.95;max-width:90%;margin:0;margin-bottom:${marginY}px">${escapeHtml(subtext)}</p>` : ""}${cta ? `<span style="display:inline-block;padding:14px 28px;background:${accent};color:#fff;font-size:${ctaSize}px;font-weight:600;border-radius:8px">${escapeHtml(cta)}</span>` : ""}</div>`;
}

const LAYOUT_HTML_MAP: Record<string, (p: LayoutProps) => string> = {
  "squareTopHeading": squareTopHeadingHtml,
  "top-heading": squareTopHeadingHtml,
  "splitLeftText": splitLeftTextHtml,
  "split-text-product": splitLeftTextHtml,
  "verticalStoryCentered": verticalStoryCenteredHtml,
  "centered-vertical": verticalStoryCenteredHtml,
  "vertical-story": verticalStoryCenteredHtml,
  "productHero": productHeroHtml,
  "product-hero": productHeroHtml,
  "center-product": productHeroHtml,
  "bold-center": squareTopHeadingHtml,
  "banner-wide": squareTopHeadingHtml,
  "quote-block": squareTopHeadingHtml,
  "default": squareTopHeadingHtml,
};

/**
 * Render layout to HTML string. No React. Used by compositeRenderer for API route bundle.
 */
export function renderLayoutToHtml(props: LayoutProps): { html: string; width: number; height: number } {
  const layoutKey = props.layout ?? "default";
  const renderInner = LAYOUT_HTML_MAP[layoutKey] ?? LAYOUT_HTML_MAP.default;
  const { width, height } = props;
  const bodyStyle = `margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden`;
  const inner = renderInner(props);
  const html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>html,body{" + bodyStyle + "}</style></head><body style=\"" + bodyStyle + "\">" + inner + "</body></html>";
  return { html, width, height };
}

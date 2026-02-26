/**
 * Deterministic canvas renderer — all text, layout, CTA, and logo placement via Node Canvas.
 * No text from the AI image model. Enterprise-grade reliability.
 */

import { createCanvas, loadImage, type CanvasRenderingContext2D } from "canvas";

/** Aspect ratio → [width, height] for final composite. */
const ASPECT_DIMENSIONS: Record<string, [number, number]> = {
  "1:1": [1080, 1080],
  "9:16": [1080, 1920],
  "16:9": [1280, 720],
  "4:3": [1080, 810],
  "3:4": [810, 1080],
  "2:3": [720, 1080],
  "4:5": [864, 1080],
};

const SAFE_MARGIN = 80;
const OVERLAY_OPACITY = 0.35;
const MAX_HEADLINE_LINES = 3;
const LOGO_INSET = 80;
const LOGO_MAX_SIZE = 120;
const CTA_PADDING_X = 32;
const CTA_PADDING_Y = 16;
const CTA_BORDER_RADIUS = 8;

export type BlueprintForRender = {
  aspectRatio: string;
  layout: string;
  includeLogo: boolean;
  ideaType?: string;
  intent: {
    headline: string;
    subtext: string;
    cta: string;
    visualDirection?: string;
    toneAdjustment?: string;
  };
};

export type BrandForRender = {
  colors?: string[];
  fonts?: string[];
};

export type RenderAssetInput = {
  backgroundBuffer: Buffer;
  blueprint: BlueprintForRender;
  brand: BrandForRender | null;
  logoBuffer: Buffer | null;
};

/**
 * Get canvas dimensions from blueprint aspect ratio.
 */
export function getCanvasDimensions(aspectRatio: string): { width: number; height: number } {
  const pair = ASPECT_DIMENSIONS[aspectRatio] ?? ASPECT_DIMENSIONS["1:1"];
  return { width: pair[0], height: pair[1] };
}

/**
 * Wrap text to fit within maxWidth; returns lines. Reduces font size if lines exceed maxLines.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  initialFontSize: number
): { lines: string[]; fontSize: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], fontSize: initialFontSize };

  let fontSize = initialFontSize;
  let lines: string[] = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
    lines = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      const m = ctx.measureText(testLine);
      if (m.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    if (lines.length <= maxLines) break;
    fontSize = Math.max(24, Math.floor(fontSize * 0.85));
  }

  return { lines, fontSize };
}

/**
 * Render composite: background + overlay + headline + subtext + CTA + logo.
 * Returns PNG buffer. All typography and layout are deterministic.
 */
export async function renderAsset(input: RenderAssetInput): Promise<Buffer> {
  const { backgroundBuffer, blueprint, brand, logoBuffer } = input;
  const { width, height } = getCanvasDimensions(blueprint.aspectRatio);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const primaryColor = brand?.colors?.[0] ?? "#111111";
  const accentColor = brand?.colors?.[1] ?? "#2563eb";

  // 1. Draw background (scale to cover)
  const bgImage = await loadImage(backgroundBuffer);
  const bgScale = Math.max(width / bgImage.width, height / bgImage.height);
  const bgW = bgImage.width * bgScale;
  const bgH = bgImage.height * bgScale;
  const bgX = (width - bgW) / 2;
  const bgY = (height - bgH) / 2;
  ctx.drawImage(bgImage, bgX, bgY, bgW, bgH);

  // 2. Subtle overlay for text readability
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `rgba(0,0,0,${OVERLAY_OPACITY * 0.5})`);
  gradient.addColorStop(0.3, `rgba(0,0,0,${OVERLAY_OPACITY * 0.2})`);
  gradient.addColorStop(0.7, `rgba(0,0,0,${OVERLAY_OPACITY * 0.2})`);
  gradient.addColorStop(1, `rgba(0,0,0,${OVERLAY_OPACITY * 0.6})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const contentLeft = SAFE_MARGIN;
  const contentRight = width - SAFE_MARGIN;
  const contentWidth = contentRight - contentLeft;
  let yCursor = SAFE_MARGIN + 40;

  // Logo zone (top-right) — reserve space so text never overlaps
  const logoSize = Math.min(LOGO_MAX_SIZE, Math.min(width, height) * 0.12);
  const logoX = width - LOGO_INSET - logoSize;
  const logoY = LOGO_INSET;
  if (blueprint.includeLogo && logoBuffer) {
    try {
      const logoImg = await loadImage(logoBuffer);
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    } catch {
      // ignore logo load error
    }
  }

  // Headline zone (avoid overlapping logo: stay left of logo or below)
  const headlineMaxWidth = blueprint.includeLogo && logoBuffer ? logoX - contentLeft - 20 : contentWidth;
  const headlineFontSize = Math.min(72, Math.round(Math.min(width, height) * 0.07));
  const { lines: headlineLines, fontSize: headlineFont } = wrapText(
    ctx,
    blueprint.intent.headline || "Headline",
    headlineMaxWidth,
    MAX_HEADLINE_LINES,
    headlineFontSize
  );
  ctx.font = `700 ${headlineFont}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = primaryColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const headlineX = contentLeft + contentWidth / 2;
  const lineHeight = headlineFont * 1.2;
  for (const line of headlineLines) {
    ctx.fillText(line, headlineX, yCursor);
    yCursor += lineHeight;
  }
  yCursor += 24;

  // Subtext
  const subtext = (blueprint.intent.subtext || "").trim();
  if (subtext) {
    const subtextFontSize = Math.min(36, Math.round(headlineFont * 0.5));
    ctx.font = `${subtextFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = primaryColor;
    ctx.globalAlpha = 0.95;
    const subtextLines = subtext.slice(0, 120).match(/.{1,50}(\s|$)/g) ?? [subtext.slice(0, 50)];
    const subtextLineHeight = subtextFontSize * 1.35;
    for (let i = 0; i < Math.min(3, subtextLines.length); i++) {
      ctx.fillText(subtextLines[i].trim(), headlineX, yCursor);
      yCursor += subtextLineHeight;
    }
    ctx.globalAlpha = 1;
    yCursor += 20;
  }

  // CTA button (deterministic position: centered, below text)
  const ctaText = (blueprint.intent.cta || "Learn more").trim().slice(0, 24);
  if (ctaText) {
    ctx.font = `600 ${Math.min(28, Math.round(headlineFont * 0.4))}px system-ui, sans-serif`;
    const ctaW = ctx.measureText(ctaText).width + CTA_PADDING_X * 2;
    const ctaH = CTA_PADDING_Y * 2 + 28;
    const ctaX = (width - ctaW) / 2;
    const ctaY = Math.min(yCursor, height - SAFE_MARGIN - ctaH - 60);
    ctx.fillStyle = accentColor;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, CTA_BORDER_RADIUS);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ctaText, width / 2, ctaY + ctaH / 2);
  }

  return canvas.toBuffer("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

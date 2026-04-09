/**
 * Canvas Renderer (compat layer)
 * Restores the legacy API expected by workers/image-generator.ts
 * using the new deterministic HTML + Puppeteer render pipeline.
 */

import { renderComposite } from "@/lib/render/compositeRenderer";
import type { Blueprint } from "@/lib/generation/blueprintFactory";

export type BlueprintForRender = {
  aspectRatio: string;
  layout: string;
  includeLogo: boolean;
  ideaType?: string;
  intent: {
    headline: string;
    subtext: string;
    cta: string;
    visualDirection: string;
    toneAdjustment: string;
  };
  compositionBehavior?: string;
};

export type RenderAssetInput = {
  backgroundBuffer: Buffer;
  blueprint: BlueprintForRender;
  brand: { colors?: string[]; fonts?: string[] } | null;
  logoBuffer?: Buffer | null;
};

const ASPECT_TO_DIMENSIONS: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "9:16": [576, 1024],
  "16:9": [1344, 768],
  "4:3": [1152, 896],
  "3:4": [768, 1024],
  "2:3": [682, 1024],
  "4:5": [819, 1024],
  "3:2": [1152, 768],
  "5:4": [1024, 819],
  "4:1": [1344, 336],
  "3:1": [1200, 400],
  "2.7:1": [1344, 498],
  "21:9": [1344, 576],
};

export function getCanvasDimensions(aspectRatio: string): { width: number; height: number } {
  const pair = ASPECT_TO_DIMENSIONS[aspectRatio] ?? ASPECT_TO_DIMENSIONS["1:1"];
  return { width: pair[0], height: pair[1] };
}

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function renderAsset(input: RenderAssetInput): Promise<Buffer> {
  const { backgroundBuffer, blueprint, brand, logoBuffer } = input;
  const { width, height } = getCanvasDimensions(blueprint.aspectRatio);

  const compositeBlueprint: Blueprint = {
    ideaType: blueprint.ideaType ?? "custom",
    aspectRatio: blueprint.aspectRatio,
    layout: blueprint.layout,
    includeLogo: blueprint.includeLogo,
    compositionBehavior: blueprint.compositionBehavior,
    intent: blueprint.intent,
    width,
    height,
  };

  const backgroundUrl = toDataUrl(backgroundBuffer, "image/png");
  const logoUrl = logoBuffer ? toDataUrl(logoBuffer, "image/png") : null;

  const pngBuffer = await renderComposite({
    backgroundUrl,
    blueprint: compositeBlueprint,
    brand: brand ? { colors: brand.colors, fonts: brand.fonts } : null,
    logoUrl: compositeBlueprint.includeLogo ? logoUrl ?? undefined : undefined,
  });

  if (!pngBuffer) {
    throw new Error("Composite renderer failed to produce a PNG buffer.");
  }

  return pngBuffer;
}

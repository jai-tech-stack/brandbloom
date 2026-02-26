/**
 * Layout system — deterministic only. No AI.
 * Maps blueprint layout key to component and renders to HTML for composite export.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SquareTopHeading } from "./squareTopHeading";
import { SplitLeftText } from "./splitLeftText";
import { VerticalStoryCentered } from "./verticalStoryCentered";
import { ProductHero } from "./productHero";
import type { LayoutProps } from "./types";

export type { LayoutProps } from "./types";

const LAYOUT_MAP: Record<string, React.ComponentType<LayoutProps>> = {
  "squareTopHeading": SquareTopHeading,
  "top-heading": SquareTopHeading,
  "splitLeftText": SplitLeftText,
  "split-text-product": SplitLeftText,
  "verticalStoryCentered": VerticalStoryCentered,
  "centered-vertical": VerticalStoryCentered,
  "vertical-story": VerticalStoryCentered,
  "productHero": ProductHero,
  "product-hero": ProductHero,
  "center-product": ProductHero,
  "bold-center": SquareTopHeading,
  "banner-wide": SquareTopHeading,
  "quote-block": SquareTopHeading,
  "default": SquareTopHeading,
};

/**
 * Render layout to HTML string. Deterministic. No AI.
 * Full document with viewport and body dimensions for Puppeteer screenshot.
 */
export function renderLayoutToHtml(props: LayoutProps): { html: string; width: number; height: number } {
  const layoutKey = props.layout ?? "default";
  const Component = LAYOUT_MAP[layoutKey] ?? LAYOUT_MAP.default;
  const { width, height } = props;
  const bodyStyle = `margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden`;
  const html =
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>html,body{" + bodyStyle + "}</style></head><body style=\"" + bodyStyle + "\">" +
    renderToStaticMarkup(React.createElement(Component, props)) +
    "</body></html>";
  return { html, width, height };
}

export { SquareTopHeading, SplitLeftText, VerticalStoryCentered, ProductHero };

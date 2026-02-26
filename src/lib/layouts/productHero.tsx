/**
 * Product Hero — deterministic layout.
 * Background full-bleed. Headline prominent. CTA bottom-center. Logo bottom-right.
 * Margin: 6%. No AI.
 */

import React from "react";
import type { LayoutProps } from "./types";

const MARGIN_PCT = 6;

export function ProductHero(props: LayoutProps) {
  const {
    width,
    height,
    backgroundUrl,
    headline,
    subtext,
    cta,
    logoUrl,
    brandColors = [],
    fontFamily = "system-ui, -apple-system, sans-serif",
    fontFamilyHeadline,
  } = props;

  const marginX = (width * MARGIN_PCT) / 100;
  const marginY = (height * MARGIN_PCT) / 100;
  const headlineSize = Math.round(Math.min(width, height) * 0.09);
  const subtextSize = Math.round(headlineSize * 0.45);
  const ctaSize = Math.round(headlineSize * 0.5);
  const logoSize = Math.round(Math.min(width, height) * 0.11);
  const primary = brandColors[0] ?? "#111111";
  const accent = brandColors[1] ?? "#2563eb";
  const headlineFont = fontFamilyHeadline ?? fontFamily;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        margin: 0,
        overflow: "hidden",
        fontFamily,
        background: `url("${escapeCssUrl(backgroundUrl)}") center/cover no-repeat`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: marginY,
        paddingBottom: marginY + logoSize + 8,
      }}
    >
      <h1
        style={{
          color: primary,
          fontSize: headlineSize,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.15,
          maxWidth: "95%",
          wordWrap: "break-word",
          textShadow: "0 2px 4px rgba(0,0,0,0.4)",
          fontFamily: headlineFont,
          margin: 0,
          marginBottom: subtext ? marginY * 0.5 : marginY,
        }}
      >
        {headline}
      </h1>
      {subtext && (
        <p
          style={{
            color: primary,
            fontSize: subtextSize,
            textAlign: "center",
            opacity: 0.95,
            maxWidth: "90%",
            margin: 0,
            marginBottom: marginY,
          }}
        >
          {subtext}
        </p>
      )}
      {cta && (
        <span
          style={{
            display: "inline-block",
            padding: "14px 28px",
            background: accent,
            color: "#fff",
            fontSize: ctaSize,
            fontWeight: 600,
            borderRadius: 8,
          }}
        >
          {cta}
        </span>
      )}
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          style={{
            position: "absolute",
            bottom: marginY,
            right: marginX,
            width: logoSize,
            height: logoSize,
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
}

function escapeCssUrl(url: string): string {
  return url.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

/**
 * Vertical Story Centered — full-bleed, content centered. No AI.
 */

import React from "react";
import type { LayoutProps } from "./types";

const MARGIN_PCT = 8;

function esc(url: string) {
  return url.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

export function VerticalStoryCentered(props: LayoutProps) {
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

  const margin = (Math.min(width, height) * MARGIN_PCT) / 100;
  const headlineSize = Math.round(Math.min(width, height) * 0.07);
  const subtextSize = Math.round(headlineSize * 0.5);
  const ctaSize = Math.round(headlineSize * 0.45);
  const logoSize = Math.round(Math.min(width, height) * 0.1);
  const primary = brandColors[0] ?? "#111111";
  const accent = brandColors[1] ?? "#2563eb";
  const headlineFont = fontFamilyHeadline ?? fontFamily;
  const bg = "url(\"" + esc(backgroundUrl) + "\") center/cover no-repeat";

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        margin: 0,
        overflow: "hidden",
        fontFamily,
        background: bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: margin,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          style={{
            position: "absolute",
            top: margin,
            left: "50%",
            transform: "translateX(-50%)",
            width: logoSize,
            height: logoSize,
            objectFit: "contain",
          }}
        />
      ) : null}
      <h1
        style={{
          color: primary,
          fontSize: headlineSize,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: "90%",
          wordWrap: "break-word",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          fontFamily: headlineFont,
          margin: 0,
        }}
      >
        {headline}
      </h1>
      {subtext ? (
        <p
          style={{
            color: primary,
            fontSize: subtextSize,
            textAlign: "center",
            marginTop: margin * 0.8,
            opacity: 0.95,
            maxWidth: "85%",
            marginBottom: 0,
          }}
        >
          {subtext}
        </p>
      ) : null}
      {cta ? (
        <span
          style={{
            display: "inline-block",
            marginTop: margin,
            padding: "12px 24px",
            background: accent,
            color: "#fff",
            fontSize: ctaSize,
            fontWeight: 600,
            borderRadius: 8,
          }}
        >
          {cta}
        </span>
      ) : null}
    </div>
  );
}

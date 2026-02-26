import React from "react";
import type { LayoutProps } from "./types";

const MARGIN_PCT = 6;

function esc(url: string) {
  return url.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

export function SquareTopHeading(props: LayoutProps) {
  const { width, height, backgroundUrl, headline, subtext, cta, logoUrl, brandColors = [], fontFamily = "system-ui", fontFamilyHeadline } = props;
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

  return (
    <div style={{ position: "relative", width, height, margin: 0, overflow: "hidden", fontFamily, background: bg, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center", padding: marginY + "px " + marginX + "px" }}>
      {logoUrl ? <img src={logoUrl} alt="" style={{ position: "absolute", top: marginY, right: marginX, width: logoSize, height: logoSize, objectFit: "contain" }} /> : null}
      <h1 style={{ color: primary, fontSize: headlineSize, fontWeight: 700, textAlign: "center", lineHeight: 1.2, maxWidth: "100%", wordWrap: "break-word", textShadow: "0 1px 2px rgba(0,0,0,0.3)", fontFamily: headlineFont, margin: 0 }}>{headline}</h1>
      {subtext ? <p style={{ color: primary, fontSize: subtextSize, textAlign: "center", marginTop: marginY * 0.8, opacity: 0.95, maxWidth: "90%", marginBottom: 0 }}>{subtext}</p> : null}
      {cta ? <span style={{ display: "inline-block", marginTop: marginY, padding: "12px 24px", background: accent, color: "#fff", fontSize: ctaSize, fontWeight: 600, borderRadius: 8 }}>{cta}</span> : null}
    </div>
  );
}

import React from "react";
import type { LayoutProps } from "./types";

const MARGIN_PCT = 5;
const SPLIT_RATIO = 0.45;

function esc(url: string) {
  return url.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

export function SplitLeftText(props: LayoutProps) {
  const { width, height, backgroundUrl, headline, subtext, cta, logoUrl, brandColors = [], fontFamily = "system-ui", fontFamilyHeadline } = props;
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

  return (
    <div style={{ position: "relative", width, height, margin: 0, padding: 0, overflow: "hidden", fontFamily, display: "flex", flexDirection: "row", alignItems: "stretch" }}>
      <div style={{ width: leftW, height: "100%", background: bg, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: margin }}>
        {logoUrl ? <img src={logoUrl} alt="" style={{ position: "absolute", top: margin, left: margin, width: logoSize, height: logoSize, objectFit: "contain" }} /> : null}
        <h1 style={{ color: primary, fontSize: headlineSize, fontWeight: 700, textAlign: "left", lineHeight: 1.2, maxWidth: "100%", wordWrap: "break-word", textShadow: "0 1px 2px rgba(0,0,0,0.3)", fontFamily: headlineFont, margin: 0, marginTop: logoUrl ? logoSize + margin : 0 }}>{headline}</h1>
        {subtext ? <p style={{ color: primary, fontSize: subtextSize, textAlign: "left", marginTop: margin * 0.8, opacity: 0.95, maxWidth: "95%", marginBottom: 0 }}>{subtext}</p> : null}
        {cta ? <span style={{ display: "inline-block", marginTop: margin, padding: "10px 20px", background: accent, color: "#fff", fontSize: ctaSize, fontWeight: 600, borderRadius: 8 }}>{cta}</span> : null}
      </div>
      <div style={{ flex: 1, height: "100%", background: bgRight }} />
    </div>
  );
}

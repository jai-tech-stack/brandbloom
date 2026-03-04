// src/app/api/brand-kit-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

export const maxDuration = 30;

// Parse a JSON string field safely
function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// Convert hex to RGB
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}

// Determine if text on a color should be black or white
function textColorForBg(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    if (!brandId) return NextResponse.json({ error: "brandId required." }, { status: 400 });

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: authUser.id },
    });
    if (!brand) return NextResponse.json({ error: "Brand not found." }, { status: 404 });

    // Extract brand data
    const colors: string[] = parseJson<string[]>(brand.colors, []);
    const fonts: string[] = parseJson<string[]>(brand.fonts, []);
    const primaryColor = brand.primaryColor ?? colors[0] ?? "#ea751d";
    const secondaryColorsList: string[] = parseJson<string[]>(brand.secondaryColors, colors.slice(1));
    const allColors = [primaryColor, ...secondaryColorsList].filter(Boolean).slice(0, 6);
    const personalityTraits: string[] = parseJson<string[]>(brand.personalityTraits, []);
    const toneKeywords: string[] = [];

    // Parse deep analysis for extra fields
    type DeepAnalysis = { toneKeywords?: string[]; aestheticNarrative?: string; values?: string[]; visualStyleSummary?: string };
    const deep = parseJson<DeepAnalysis>(brand.deepAnalysis, {});
    const toneArr = deep.toneKeywords ?? personalityTraits;
    toneKeywords.push(...toneArr.slice(0, 6));

    const headingFont = brand.headingFont ?? fonts[0] ?? "System UI";
    const bodyFont = brand.bodyFont ?? fonts[1] ?? fonts[0] ?? "System UI";
    const tone = brand.toneOfVoice ?? brand.tone ?? personalityTraits.slice(0, 3).join(", ") ?? "";
    const audience = brand.targetAudience ?? "";
    const aesthetic = deep.aestheticNarrative ?? brand.description ?? "";
    const values: string[] = deep.values ?? [];

    // Generate SVG-based PDF as HTML (converted to PDF via browser print)
    // We return an HTML page that auto-triggers print dialog for PDF save
    const primaryTextColor = textColorForBg(primaryColor);

    const colorSwatches = allColors.map((c) => {
      const tc = textColorForBg(c);
      return `
        <div style="display:inline-block;margin-right:12px;margin-bottom:12px;text-align:center">
          <div style="width:64px;height:64px;border-radius:10px;background:${c};margin-bottom:6px;border:1px solid rgba(0,0,0,0.08)"></div>
          <div style="font-size:9px;color:#555;font-family:monospace">${c.toUpperCase()}</div>
        </div>`;
    }).join("");

    const personalityBadges = toneKeywords.slice(0, 8).map((t) =>
      `<span style="display:inline-block;padding:4px 10px;border-radius:100px;background:#f4f4f4;font-size:10px;margin:3px;color:#333">${t}</span>`
    ).join("");

    const valuesList = values.slice(0, 5).map((v) =>
      `<li style="padding:4px 0;font-size:11px;color:#444;border-bottom:1px solid #f0f0f0">· ${v}</li>`
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${brand.name} Brand Kit</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1a1a1a; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 0; }
  }
  .page { width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; background: #fff; }
  .header { background: ${primaryColor}; padding: 40px 48px 36px; }
  .header-brand { font-size: 28px; font-weight: 800; color: ${primaryTextColor}; letter-spacing: -0.5px; }
  .header-tagline { font-size: 13px; color: ${primaryTextColor}; opacity: 0.75; margin-top: 6px; }
  .header-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: ${primaryTextColor}; opacity: 0.5; margin-bottom: 10px; }
  .body { padding: 40px 48px; }
  .section { margin-bottom: 36px; }
  .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #999; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 16px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .font-preview { padding: 14px; background: #f8f8f8; border-radius: 8px; margin-bottom: 10px; }
  .font-name { font-size: 9px; color: #999; margin-bottom: 4px; }
  .font-sample-heading { font-size: 22px; font-weight: 700; color: #1a1a1a; }
  .font-sample-body { font-size: 13px; color: #666; margin-top: 4px; }
  .description { font-size: 12px; color: #555; line-height: 1.6; }
  .footer { margin-top: auto; padding: 20px 48px; border-top: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; }
  .footer-logo { font-size: 11px; font-weight: 700; color: ${primaryColor}; }
  .footer-date { font-size: 9px; color: #ccc; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: ${primaryColor}; color: ${primaryTextColor}; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-label">Brand Kit</div>
    <div class="header-brand">${brand.name}</div>
    ${brand.tagline ? `<div class="header-tagline">${brand.tagline}</div>` : ""}
  </div>

  <div class="body">
    <div class="two-col">
      <div>
        <!-- Colors -->
        <div class="section">
          <div class="section-title">Brand Colors</div>
          ${colorSwatches || '<p style="font-size:11px;color:#999">No colors extracted.</p>'}
        </div>

        <!-- Typography -->
        <div class="section">
          <div class="section-title">Typography</div>
          <div class="font-preview">
            <div class="font-name">Heading Font</div>
            <div class="font-sample-heading" style="font-family:'${headingFont}',serif">${headingFont}</div>
          </div>
          <div class="font-preview">
            <div class="font-name">Body Font</div>
            <div class="font-sample-body" style="font-family:'${bodyFont}',sans-serif">${bodyFont}</div>
          </div>
        </div>

        ${values.length > 0 ? `
        <!-- Values -->
        <div class="section">
          <div class="section-title">Brand Values</div>
          <ul style="list-style:none">${valuesList}</ul>
        </div>
        ` : ""}
      </div>

      <div>
        <!-- Personality -->
        ${toneKeywords.length > 0 ? `
        <div class="section">
          <div class="section-title">Personality & Tone</div>
          <div>${personalityBadges}</div>
          ${tone ? `<p style="margin-top:10px;font-size:11px;color:#666">${tone}</p>` : ""}
        </div>
        ` : ""}

        <!-- Audience -->
        ${audience ? `
        <div class="section">
          <div class="section-title">Target Audience</div>
          <p class="description">${audience}</p>
        </div>
        ` : ""}

        <!-- Aesthetic narrative -->
        ${aesthetic ? `
        <div class="section">
          <div class="section-title">Visual Aesthetic</div>
          <p class="description">${aesthetic.slice(0, 300)}${aesthetic.length > 300 ? "…" : ""}</p>
        </div>
        ` : ""}

        <!-- Logo -->
        ${brand.image ? `
        <div class="section">
          <div class="section-title">Logo</div>
          <div style="padding:16px;background:#f8f8f8;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <img src="${brand.image}" alt="${brand.name} logo" style="max-height:80px;max-width:160px;object-fit:contain" />
          </div>
        </div>
        ` : ""}
      </div>
    </div>
  </div>

  <div class="footer">
    <span class="footer-logo">BrandBloom</span>
    <span class="footer-date">Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
  </div>
</div>

<button class="print-btn no-print" onclick="window.print()">Save as PDF ↓</button>
<script>
// Auto-open print dialog after 300ms
setTimeout(() => {
  if (window.location.search.includes('auto=1')) window.print();
}, 300);
</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[brand-kit-pdf] error:", e);
    return NextResponse.json({ error: "PDF generation failed." }, { status: 500 });
  }
}
/**
 * Extract brand from logo only — separate from URL-based extraction.
 * Flow: upload logo to S3 → vision AI → Brand Intelligence JSON → save Brand → return brandId.
 * Does not modify /api/extract-brand or any URL logic.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { uploadBufferToStorage } from "@/server/services/storage";
import { analyzeLogoWithVision, OpenAIKeyRequiredError } from "@/lib/logo-brand-analysis";
import { fromLogoIntelligence, unifiedToBrandIntelligence } from "@/lib/unified-brand-intelligence";
import { brandIntelligenceToPrismaData, brandIntelligenceColors, brandIntelligenceFonts } from "@/lib/brand-intelligence";

const LOGO_PLACEHOLDER_SITE = "https://logo-only.brandbloom.local";
const LOGO_PLACEHOLDER_DOMAIN = "logo-only";
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];

function toHex(color: string): string {
  const s = color.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) {
    const hex = s.slice(1);
    if (hex.length === 3) return "#" + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return "#" + hex.slice(0, 6).toLowerCase();
  }
  return s || "#111111";
}

export async function POST(request: NextRequest) {
  // #region agent log
  fetch("http://127.0.0.1:7926/ingest/90767cbc-7ef4-42c1-8d35-81a50ac82a6f", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dd0430" }, body: JSON.stringify({ sessionId: "dd0430", runId: "run1", hypothesisId: "B", location: "extract-brand-from-logo/route.ts:POST", message: "extract-brand-from-logo entry", data: {}, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Sign in required to create a brand from logo." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const logoFile = formData.get("logo") as File | null;
    const brandNameOverride = (formData.get("brandName") as string | null)?.trim() || null;

    if (!logoFile || !(logoFile instanceof File)) {
      return NextResponse.json(
        { error: "Missing logo file. Send a multipart field named 'logo'." },
        { status: 400 }
      );
    }

    if (logoFile.size > MAX_LOGO_SIZE) {
      return NextResponse.json(
        { error: "Logo file must be under 5MB." },
        { status: 400 }
      );
    }

    const contentType = logoFile.type || "image/png";
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Logo must be PNG, JPEG, WebP, or SVG." },
        { status: 400 }
      );
    }

    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload logo to S3 (or use data URL for vision if no S3)
    const logoKey = `logos/${authUser.id}/${Date.now()}-${logoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const logoUrl = await uploadBufferToStorage(buffer, logoKey, contentType);
    const imageForVision = logoUrl ?? `data:${contentType};base64,${buffer.toString("base64")}`;

    // 2. Vision AI → Unified Brand Intelligence
    const intelligence = await analyzeLogoWithVision(imageForVision);
    const unified = fromLogoIntelligence(intelligence);
    const bi = unifiedToBrandIntelligence(unified, "logo", logoUrl ?? null);
    if (brandNameOverride) bi.brandName = brandNameOverride;
    // Normalize colors to hex
    bi.primaryColor = bi.primaryColor ? toHex(bi.primaryColor) : "#111111";
    bi.secondaryColors = bi.secondaryColors.map(toHex).filter(Boolean).slice(0, 5);

    const canonical = brandIntelligenceToPrismaData(bi);
    const logoUrlsForBrand = logoUrl ? [logoUrl] : [];

    const brand = await prisma.brand.create({
      data: {
        userId: authUser.id,
        ...canonical,
        siteUrl: LOGO_PLACEHOLDER_SITE,
        domain: LOGO_PLACEHOLDER_DOMAIN,
        image: logoUrl ?? null,
        logos: logoUrlsForBrand.length ? JSON.stringify(logoUrlsForBrand) : null,
        socialAccounts: null,
        deepAnalysis: JSON.stringify(unified),
        source: "logo",
        sourceType: "logo",
      },
    });

    const colors = brandIntelligenceColors(bi);
    const fonts = brandIntelligenceFonts(bi);
    return NextResponse.json({
      brandId: brand.id,
      brand: {
        brandId: brand.id,
        name: brand.name,
        domain: brand.domain,
        siteUrl: brand.siteUrl,
        description: [brand.brandStory, brand.mission].filter(Boolean).join(" ") || null,
        tagline: brand.tagline,
        colors,
        fonts,
        logos: logoUrlsForBrand,
        personality: brand.personality,
        tone: brand.toneOfVoice ?? brand.tone,
      },
    });
  } catch (e) {
    // #region agent log
    fetch("http://127.0.0.1:7926/ingest/90767cbc-7ef4-42c1-8d35-81a50ac82a6f", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dd0430" }, body: JSON.stringify({ sessionId: "dd0430", runId: "run1", hypothesisId: "B", location: "extract-brand-from-logo/route.ts catch", message: "extract-brand-from-logo error", data: { error: String(e), name: (e as Error)?.name }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    console.error("extract-brand-from-logo error:", e);
    if (e instanceof OpenAIKeyRequiredError) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is required for logo extraction. Add it to your server environment (.env)." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Brand extraction from logo failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import {
  brandRowToIntelligence,
  brandIntelligenceColors,
  brandIntelligenceFonts,
  brandIntelligenceToPrismaData,
  type BrandIntelligence,
} from "@/lib/brand-intelligence";
import { analyzeBrand } from "@/lib/brand/unified-analyzer";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await resolveAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if brand belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id, userId: user.id },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Delete brand (assets will be cascade deleted or set to null based on schema)
    await prisma.brand.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("brand DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await resolveAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brand = await prisma.brand.findFirst({
      where: { id, userId: user.id },
      include: {
        assets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const strategy = brand.strategyProfile ? (() => { try { return JSON.parse(brand.strategyProfile!) as Record<string, unknown>; } catch { return null; } })() : null;
    const bi = brandRowToIntelligence(brand);
    const colors = brandIntelligenceColors(bi);
    const fonts = brandIntelligenceFonts(bi);
    const logos = brand.logos ? (typeof brand.logos === "string" ? JSON.parse(brand.logos) : brand.logos) : [];
    const parsedBrand = {
      ...brand,
      brandId: brand.id,
      colors,
      fonts,
      logos,
      personality: bi.personalityTraits.length ? bi.personalityTraits.join(", ") : brand.personality,
      tone: bi.toneOfVoice ?? brand.tone,
      visualStyleSummary: bi.visualStyle ?? null,
      targetAudience: bi.targetAudience ?? null,
      values: bi.personalityTraits,
      ...(strategy && { strategyProfile: strategy }),
    };

    return NextResponse.json({ brand: parsedBrand });
  } catch (e) {
    console.error("brand GET error:", e);
    return NextResponse.json({ error: "Failed to fetch brand" }, { status: 500 });
  }
}

function extractionConfidence(input: {
  colors: string[];
  fonts: string[];
  logos: string[];
  description?: string | null;
  personality?: string | null;
  tone?: string | null;
}): number {
  let score = 0.2;
  if (input.logos.length > 0) score += 0.2;
  if (input.colors.length > 0) score += 0.2;
  if (input.fonts.length > 0) score += 0.15;
  if ((input.description || "").trim().length > 20) score += 0.15;
  if ((input.personality || "").trim().length > 0) score += 0.05;
  if ((input.tone || "").trim().length > 0) score += 0.05;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await resolveAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brand = await prisma.brand.findFirst({
      where: { id, userId: user.id },
    });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const sourceType = brand.sourceType === "instagram" ? "instagram" : brand.sourceType === "logo" ? "logo" : "url";
    if (sourceType === "logo") {
      return NextResponse.json({ error: "Logo-based brands cannot be re-extracted yet." }, { status: 400 });
    }
    if (!brand.siteUrl) {
      return NextResponse.json({ error: "No source URL available for re-extraction." }, { status: 400 });
    }

    const analyzed = await analyzeBrand({
      method: sourceType,
      urlHref: sourceType === "url" ? brand.siteUrl : undefined,
      instagramUrl: sourceType === "instagram" ? brand.siteUrl : undefined,
      instagramHandle: sourceType === "instagram" ? brand.domain?.replace(/^instagram:/, "") : undefined,
    });

    const bi: BrandIntelligence = {
      brandName: analyzed.name,
      sourceType: sourceType === "instagram" ? "url" : sourceType,
      logoUrl: analyzed.logos[0] ?? null,
      primaryColor: analyzed.colors[0] ?? null,
      secondaryColors: analyzed.colors.slice(1, 6),
      headingFont: analyzed.fonts[0] ?? null,
      bodyFont: analyzed.fonts[1] ?? analyzed.fonts[0] ?? null,
      toneOfVoice: analyzed.tone ?? null,
      personalityTraits: analyzed.personality ? analyzed.personality.split(",").map((p) => p.trim()).filter(Boolean).slice(0, 6) : [],
      industry: analyzed.industry ?? null,
      targetAudience: analyzed.targetAudience ?? null,
      visualStyle: analyzed.aestheticNarrative ?? null,
      brandArchetype: null,
      tagline: analyzed.tagline || null,
      mission: null,
      vision: null,
      brandStory: analyzed.description ?? null,
    };

    const canonical = brandIntelligenceToPrismaData(bi);
    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...canonical,
        sourceType,
        source: sourceType,
        image: bi.logoUrl,
        logos: bi.logoUrl ? JSON.stringify([bi.logoUrl]) : null,
        description: analyzed.description || brand.description,
        deepAnalysis: JSON.stringify({
          aestheticNarrative: analyzed.aestheticNarrative ?? null,
          extractedAt: new Date().toISOString(),
        }),
      },
    });

    const confidence = extractionConfidence({
      colors: analyzed.colors,
      fonts: analyzed.fonts,
      logos: analyzed.logos,
      description: analyzed.description,
      personality: analyzed.personality,
      tone: analyzed.tone,
    });

    return NextResponse.json({
      success: true,
      brand: {
        id: updated.id,
        name: updated.name,
        domain: updated.domain,
        colors: analyzed.colors,
        fonts: analyzed.fonts,
        extraction: {
          confidence,
          confidenceLabel: confidence >= 0.75 ? "high" : confidence >= 0.5 ? "medium" : "low",
          sourceType,
        },
      },
    });
  } catch (e) {
    console.error("brand PATCH error:", e);
    return NextResponse.json({ error: "Failed to improve extraction" }, { status: 500 });
  }
}

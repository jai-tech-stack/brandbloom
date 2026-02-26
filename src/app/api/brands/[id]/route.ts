import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { brandRowToIntelligence, brandIntelligenceColors, brandIntelligenceFonts } from "@/lib/brand-intelligence";

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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { brandRowToIntelligence, brandIntelligenceColors, brandIntelligenceFonts } from "@/lib/brand-intelligence";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brands = await prisma.brand.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });

    // Parse JSON fields and deepAnalysis
    const parsedBrands = brands.map((brand) => {
      const bi = brandRowToIntelligence(brand);
      const colors = brandIntelligenceColors(bi);
      const fonts = brandIntelligenceFonts(bi);
      return {
        ...brand,
        colors,
        fonts,
        logos: brand.logos ? (typeof brand.logos === "string" ? JSON.parse(brand.logos) : brand.logos) : [],
        socialAccounts: brand.socialAccounts ? (typeof brand.socialAccounts === "string" ? JSON.parse(brand.socialAccounts) : brand.socialAccounts) : [],
        personality: bi.personalityTraits.length ? bi.personalityTraits.join(", ") : brand.personality,
        tone: bi.toneOfVoice ?? brand.tone,
        visualStyleSummary: bi.visualStyle ?? null,
        targetAudience: bi.targetAudience ?? null,
        values: bi.personalityTraits,
      };
    });

    return NextResponse.json({ brands: parsedBrands });
  } catch (e) {
    console.error("brands GET error:", e);
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 });
  }
}

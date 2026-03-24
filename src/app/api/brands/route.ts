import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { brandRowToIntelligence, brandIntelligenceColors, brandIntelligenceFonts } from "@/lib/brand-intelligence";

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

function confidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

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
      const logos = brand.logos ? (typeof brand.logos === "string" ? JSON.parse(brand.logos) : brand.logos) : [];
      const score = extractionConfidence({
        colors,
        fonts,
        logos: Array.isArray(logos) ? logos : [],
        description: brand.description,
        personality: bi.personalityTraits.length ? bi.personalityTraits.join(", ") : brand.personality,
        tone: bi.toneOfVoice ?? brand.tone,
      });
      return {
        ...brand,
        colors,
        fonts,
        logos,
        socialAccounts: brand.socialAccounts ? (typeof brand.socialAccounts === "string" ? JSON.parse(brand.socialAccounts) : brand.socialAccounts) : [],
        personality: bi.personalityTraits.length ? bi.personalityTraits.join(", ") : brand.personality,
        tone: bi.toneOfVoice ?? brand.tone,
        visualStyleSummary: bi.visualStyle ?? null,
        targetAudience: bi.targetAudience ?? null,
        values: bi.personalityTraits,
        extraction: {
          confidence: score,
          confidenceLabel: confidenceLabel(score),
          sourceType: brand.sourceType ?? "url",
        },
      };
    });

    return NextResponse.json({ brands: parsedBrands });
  } catch (e) {
    console.error("brands GET error:", e);
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 });
  }
}

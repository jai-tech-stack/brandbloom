import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { scrapeBrandFromUrl } from "@/lib/brand-scraper";
import { analyzeBrandWithAI } from "@/lib/ai-brand-analysis";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type BrandData = {
  name: string;
  description: string;
  tagline: string;
  colors: string[];
  image: string | null;
  siteUrl: string;
  domain: string;
  fonts: string[];
  logos: string[];
  personality?: string;
  tone?: string;
  brandId?: string;
};

/**
 * Fetches the URL and extracts brand data (like Bloom).
 * If user is logged in, saves Brand to DB and returns brandId.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid url" },
        { status: 400 }
      );
    }

    let scraped;
    try {
      scraped = await scrapeBrandFromUrl(url);
    } catch (fetchErr) {
      console.error("extract-brand fetch error:", fetchErr);
      return NextResponse.json(
        { error: "Could not fetch URL. Check that it is public and reachable." },
        { status: 422 }
      );
    }

    const brand: BrandData = {
      ...scraped,
      fonts: scraped.fonts ?? [],
      logos: scraped.logos ?? [],
    };

    const analysis = await analyzeBrandWithAI({
      name: scraped.name,
      description: scraped.description,
      tagline: scraped.tagline,
      colors: scraped.colors,
    });
    if (analysis.personality) brand.personality = analysis.personality;
    if (analysis.tone) brand.tone = analysis.tone;

    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      if (user) {
        const saved = await prisma.brand.create({
          data: {
            userId: user.id,
            siteUrl: url,
            name: brand.name,
            description: brand.description || null,
            tagline: brand.tagline || null,
            colors: JSON.stringify(brand.colors),
            image: brand.image,
            domain: brand.domain,
            fonts: JSON.stringify(brand.fonts),
            logos: JSON.stringify(brand.logos),
            personality: brand.personality ?? null,
            tone: brand.tone ?? null,
          },
        });
        brand.brandId = saved.id;
      }
    }

    return NextResponse.json(brand);
  } catch (e) {
    console.error("extract-brand error:", e);
    return NextResponse.json(
      { error: "Brand extraction failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";
import { analyzeBrand, type UnifiedAnalyzeInput } from "@/lib/brand/unified-analyzer";
import type { BrandIntelligence } from "@/lib/brand-intelligence";
import { brandIntelligenceToPrismaData } from "@/lib/brand-intelligence";

type CreateBrandBody = {
  method: "url" | "logo";
  url?: string;
  logoBase64?: string;
  logoMimeType?: string;
  brandName?: string;
  industry?: string;
  tone?: string;
  targetAudience?: string;
  description?: string;
  runLogoGeneration?: boolean;
};

function normalizeDomain(raw: string): string {
  try {
    const withProto = raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`;
    const hostname = new URL(withProto).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return raw.trim().toLowerCase().replace(/^www\./, "").split("/")[0];
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, data: null, error: "Sign in required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Partial<CreateBrandBody>;
    const method = body.method;

    if (method !== "url" && method !== "logo") {
      return NextResponse.json({ error: "method must be 'url' or 'logo'." }, { status: 400 });
    }

    if (method === "url") {
      if (!body.url || typeof body.url !== "string") {
        return NextResponse.json({ error: "url is required for method=url." }, { status: 400 });
      }
      const href = body.url.startsWith("http") ? body.url : `https://${body.url}`;
      const domain = normalizeDomain(href);
      const existing = await prisma.brand.findFirst({
        where: { userId: authUser.id, domain },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, data: null, error: `Brand already exists for ${domain}.` },
          { status: 409 }
        );
      }

      const input: UnifiedAnalyzeInput = {
        method: "url",
        urlHref: href,
        additionalContext: {
          tone: body.tone,
          industry: body.industry,
          audience: body.targetAudience,
        },
      };
      const analyzed = await analyzeBrand(input);
      const bi: BrandIntelligence = {
        brandName: analyzed.name,
        sourceType: "url",
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
        brandStory: body.description ?? analyzed.description ?? null,
      };
      const canonical = brandIntelligenceToPrismaData(bi);
      const saved = await prisma.brand.create({
        data: {
          userId: authUser.id,
          ...canonical,
          siteUrl: href,
          domain,
          image: bi.logoUrl,
          logos: bi.logoUrl ? JSON.stringify([bi.logoUrl]) : null,
          source: "url",
          description: analyzed.description || body.description || null,
          deepAnalysis: JSON.stringify({
            aestheticNarrative: analyzed.aestheticNarrative ?? null,
            extractedAt: new Date().toISOString(),
          }),
        },
      });
      return NextResponse.json({
        success: true,
        data: {
          brandId: saved.id,
          brand: {
            id: saved.id,
            name: saved.name,
            domain: saved.domain,
            siteUrl: saved.siteUrl,
            colors: analyzed.colors,
            fonts: analyzed.fonts,
          },
        },
        error: null,
      });
    }

    if (!body.logoBase64 || typeof body.logoBase64 !== "string") {
      return NextResponse.json({ error: "logoBase64 is required for method=logo." }, { status: 400 });
    }
    if (!body.brandName || typeof body.brandName !== "string") {
      return NextResponse.json({ error: "brandName is required for method=logo." }, { status: 400 });
    }

    const input: UnifiedAnalyzeInput = {
      method: "logo",
      logoBase64: body.logoBase64,
      logoMimeType: body.logoMimeType ?? "image/png",
      brandName: body.brandName,
      additionalContext: {
        tone: body.tone,
        industry: body.industry,
        audience: body.targetAudience,
      },
    };
    const analyzed = await analyzeBrand(input);
    const bi: BrandIntelligence = {
      brandName: analyzed.name,
      sourceType: "logo",
      logoUrl: null,
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
      brandStory: body.description ?? analyzed.description ?? null,
    };
    const canonical = brandIntelligenceToPrismaData(bi);
    const saved = await prisma.brand.create({
      data: {
        userId: authUser.id,
        ...canonical,
        siteUrl: "https://logo-only.brandbloom.local",
        domain: `logo-${Date.now()}`,
        image: null,
        logos: null,
        source: "logo",
        description: analyzed.description || body.description || null,
        deepAnalysis: JSON.stringify({
          aestheticNarrative: analyzed.aestheticNarrative ?? null,
          extractedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        brandId: saved.id,
        brand: {
          id: saved.id,
          name: saved.name,
          colors: analyzed.colors,
          fonts: analyzed.fonts,
          personality: analyzed.personality ?? null,
          tone: analyzed.tone ?? null,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("[api/brands/create] error:", error);
    return NextResponse.json(
      { success: false, data: null, error: "Brand creation failed." },
      { status: 500 }
    );
  }
}

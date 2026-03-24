import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";
import { generateBrandKitPDF } from "@/lib/brand/pdf-generator";
import { uploadBufferToStorage } from "@/server/services/storage";

export const maxDuration = 60;

type BrandKitBody = {
  brandId?: string;
  includeAssets?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, data: null, error: "Sign in required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as BrandKitBody;
    if (!body.brandId) {
      return NextResponse.json({ success: false, data: null, error: "brandId is required." }, { status: 400 });
    }

    const brand = await prisma.brand.findFirst({
      where: { id: body.brandId, userId: authUser.id },
      include: {
        assets: body.includeAssets ? { orderBy: { createdAt: "desc" }, take: 8 } : false,
      },
    });

    if (!brand) {
      return NextResponse.json({ success: false, data: null, error: "Brand not found." }, { status: 404 });
    }

    const pdfBuffer = await generateBrandKitPDF(brand, {
      includeAssets: !!body.includeAssets,
      assets: Array.isArray(brand.assets)
        ? brand.assets.map((asset) => ({ label: asset.label, type: asset.type, url: asset.url }))
        : [],
    });

    const safeName = brand.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const fileName = `${safeName || "brand"}-kit-${Date.now()}.pdf`;
    const key = `brand-kits/${authUser.id}/${fileName}`;
    const uploadedUrl = await uploadBufferToStorage(pdfBuffer, key, "application/pdf");
    const downloadUrl = uploadedUrl || `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      data: {
        pdfUrl: uploadedUrl || null,
        downloadUrl,
        fileName,
      },
      error: null,
    });
  } catch (e) {
    console.error("[brand-kit-pdf] error:", e);
    return NextResponse.json({ success: false, data: null, error: "PDF generation failed." }, { status: 500 });
  }
}

// Legacy compatibility for existing links in the dashboard.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json({ error: "brandId required." }, { status: 400 });
  }
  const response = await POST(
    new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ brandId, includeAssets: true }),
    })
  );
  if (!response.ok) return response;
  const payload = (await response.json()) as {
    success: boolean;
    data?: { downloadUrl?: string };
    error?: string;
  };
  if (!payload.success || !payload.data?.downloadUrl) {
    return NextResponse.json({ error: payload.error || "Failed to generate PDF." }, { status: 500 });
  }
  return NextResponse.redirect(payload.data.downloadUrl);
}
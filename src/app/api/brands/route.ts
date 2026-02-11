import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    // Parse JSON fields
    const parsedBrands = brands.map((brand) => ({
      ...brand,
      colors: typeof brand.colors === "string" ? JSON.parse(brand.colors) : brand.colors,
      fonts: brand.fonts ? (typeof brand.fonts === "string" ? JSON.parse(brand.fonts) : brand.fonts) : [],
      logos: brand.logos ? (typeof brand.logos === "string" ? JSON.parse(brand.logos) : brand.logos) : [],
    }));

    return NextResponse.json({ brands: parsedBrands });
  } catch (e) {
    console.error("brands GET error:", e);
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 });
  }
}

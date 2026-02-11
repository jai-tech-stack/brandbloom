import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if brand belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Delete brand (assets will be cascade deleted or set to null based on schema)
    await prisma.brand.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("brand DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const brand = await prisma.brand.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        assets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Parse JSON fields
    const parsedBrand = {
      ...brand,
      colors: typeof brand.colors === "string" ? JSON.parse(brand.colors) : brand.colors,
      fonts: brand.fonts ? (typeof brand.fonts === "string" ? JSON.parse(brand.fonts) : brand.fonts) : [],
      logos: brand.logos ? (typeof brand.logos === "string" ? JSON.parse(brand.logos) : brand.logos) : [],
    };

    return NextResponse.json({ brand: parsedBrand });
  } catch (e) {
    console.error("brand GET error:", e);
    return NextResponse.json({ error: "Failed to fetch brand" }, { status: 500 });
  }
}

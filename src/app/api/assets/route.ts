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

    const assets = await prisma.asset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        brand: {
          select: { name: true, domain: true },
        },
      },
    });

    return NextResponse.json({ assets });
  } catch (e) {
    console.error("assets GET error:", e);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

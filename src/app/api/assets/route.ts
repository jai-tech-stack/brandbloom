import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assets = await prisma.asset.findMany({
      where: { userId: user.id, url: { not: null } },
      orderBy: { createdAt: "desc" },
      include: {
        brand: {
          select: { id: true, name: true, domain: true, siteUrl: true },
        },
      },
    });

    return NextResponse.json({ assets });
  } catch (e) {
    console.error("assets GET error:", e);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

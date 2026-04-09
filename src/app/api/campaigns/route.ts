import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        brand: { select: { id: true, name: true, domain: true, image: true } },
        assets: { select: { id: true, url: true, label: true, type: true, width: true, height: true } },
      },
    });

    return NextResponse.json({
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        goal: c.goal,
        strategySummary: c.strategySummary,
        status: c.status,
        consistencyScore: c.consistencyScore,
        duration: c.duration,
        mode: c.mode,
        createdAt: c.createdAt.toISOString(),
        brand: c.brand,
        assetCount: c.assets.length,
        assets: c.assets,
      })),
    });
  } catch (e) {
    console.error("[api/campaigns] GET error:", e);
    return NextResponse.json({ error: "Failed to fetch campaigns." }, { status: 500 });
  }
}

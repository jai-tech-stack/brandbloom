import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await resolveAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if asset belongs to user
    const asset = await prisma.asset.findFirst({
      where: { id, userId: user.id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Refund credit
    await prisma.$transaction([
      prisma.asset.delete({ where: { id } }),
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("asset DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}

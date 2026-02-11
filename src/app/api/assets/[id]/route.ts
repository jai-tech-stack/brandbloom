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

    // Check if asset belongs to user
    const asset = await prisma.asset.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Refund credit
    await prisma.$transaction([
      prisma.asset.delete({ where: { id: params.id } }),
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

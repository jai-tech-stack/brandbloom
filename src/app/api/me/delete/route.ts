import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  const user = await resolveAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  await prisma.user.delete({ where: { id: user.id } });
  return NextResponse.json({ ok: true });
}
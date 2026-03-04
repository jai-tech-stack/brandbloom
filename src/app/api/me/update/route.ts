import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const user = await resolveAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { name } = await request.json().catch(() => ({})) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { name: name.trim() } });
  return NextResponse.json({ ok: true });
}
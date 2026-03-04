import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const authUser = await resolveAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { currentPassword, newPassword } = await request.json().catch(() => ({})) as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user?.password) return NextResponse.json({ error: "No password set on this account." }, { status: 400 });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: authUser.id }, data: { password: hashed } });
  return NextResponse.json({ ok: true });
}
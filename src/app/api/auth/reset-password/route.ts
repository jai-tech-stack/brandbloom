import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json().catch(() => ({})) as { token?: string; password?: string };
    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<Array<{ id: string; userId: string; token: string; expires: Date }>>`
      SELECT id, "userId", token, expires FROM "PasswordResetToken" WHERE token = ${token} LIMIT 1
    `;
    const record = rows[0];
    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "Reset link expired. Request a new one." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: record.userId }, data: { password: hashed } });
    await prisma.$executeRaw`DELETE FROM "PasswordResetToken" WHERE token = ${token}`;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reset-password]", e);
    return NextResponse.json({ error: "Reset failed." }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "No token." }, { status: 400 });

  const rows = await prisma.$queryRaw<Array<{ id: string; userId: string; token: string; expires: Date }>>`
    SELECT id, "userId", token, expires FROM "PasswordResetToken" WHERE token = ${token} LIMIT 1
  `.catch(() => [] as Array<{ id: string; userId: string; token: string; expires: Date }>);
  const record = rows[0];

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Expired." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json().catch(() => ({})) as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return 200 — don't leak if email exists
    if (!user) return NextResponse.json({ ok: true });

    // Generate a secure token (expires in 1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in DB (raw query — Prisma client may not have passwordResetToken delegate)
    const updated = await prisma.$executeRaw`
      UPDATE "PasswordResetToken" SET token = ${token}, expires = ${expires} WHERE "userId" = ${user.id}
    `;
    if (updated === 0) {
      const id = crypto.randomBytes(12).toString("hex");
      await prisma.$executeRaw`
        INSERT INTO "PasswordResetToken" (id, "userId", token, expires) VALUES (${id}, ${user.id}, ${token}, ${expires})
      `;
    }

    // Send email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail({ to: user.email!, name: user.name ?? undefined, resetUrl });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json({ ok: true }); // Always 200
  }
}
// src/app/api/account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await resolveAuthUser(request);
    if (!authUser) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = await request.json().catch(() => ({})) as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const updates: Record<string, unknown> = {};
    const errors: string[] = [];

    // ── Name update ───────────────────────────────────────────────────────────
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (name.length > 0 && name.length < 100) {
        updates.name = name;
      } else if (name.length >= 100) {
        errors.push("Name too long (max 100 chars).");
      }
    }

    // ── Email update ──────────────────────────────────────────────────────────
    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!email.includes("@")) {
        errors.push("Invalid email address.");
      } else if (email !== authUser.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          errors.push("That email is already in use.");
        } else {
          updates.email = email;
        }
      }
    }

    // ── Password update ───────────────────────────────────────────────────────
    if (body.newPassword) {
      if (!body.currentPassword) {
        errors.push("Current password required to set a new one.");
      } else if (body.newPassword.length < 8) {
        errors.push("New password must be at least 8 characters.");
      } else {
        const user = await prisma.user.findUnique({ where: { id: authUser.id } });
        const currentHash = user?.password ?? "";
        const valid = currentHash
          ? await bcrypt.compare(body.currentPassword, currentHash)
          : false;
        if (!valid) {
          errors.push("Current password is incorrect.");
        } else {
          updates.password = await bcrypt.hash(body.newPassword, 12);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes to save." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: updates,
      select: { id: true, name: true, email: true, credits: true },
    });

    return NextResponse.json({ user: updated });
  } catch (e) {
    console.error("[account] PATCH error:", e);
    return NextResponse.json({ error: "Update failed. Please try again." }, { status: 500 });
  }
}
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Resolves authenticated DB user from route handler request.
 * Uses NextAuth session first, then JWT cookie token fallback.
 * Session/token and DB use the same email (no lowercasing) so lookup matches.
 */
export async function resolveAuthUser(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email?.trim();
  if (sessionEmail) {
    const user = await prisma.user.findUnique({ where: { email: sessionEmail } });
    if (user) return user;
  }

  const token = await getToken({ req: request });
  const tokenEmail = typeof token?.email === "string" ? token.email.trim() : "";
  if (!tokenEmail) return null;

  const tokenUser = await prisma.user.findUnique({ where: { email: tokenEmail } });
  return tokenUser;
}

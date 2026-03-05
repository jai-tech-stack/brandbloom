import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.password) return null;
        const ok = await compare(credentials.password, user.password);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          credits: user.credits,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.credits = (user as { credits?: number }).credits;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
        session.user.email = (token.email as string) ?? session.user.email ?? undefined;
        session.user.name = (token.name as string) ?? session.user.name ?? undefined;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { credits: true },
          });
          (session.user as { credits?: number }).credits =
            typeof dbUser?.credits === "number" ? dbUser.credits : (token.credits as number) ?? 0;
        } catch {
          (session.user as { credits?: number }).credits = (token.credits as number) ?? 0;
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle callbackUrl safely — prevent redirect to external URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      // Decode and re-check in case of double encoding
      try {
        const decoded = decodeURIComponent(url);
        if (decoded.startsWith("/")) return `${baseUrl}${decoded}`;
        if (decoded.startsWith(baseUrl)) return decoded;
      } catch { /* ignore */ }
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
};

declare module "next-auth" {
  interface User {
    id?: string;
    credits?: number;
  }
  interface Session {
    user: User & { id?: string; credits?: number };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    credits?: number;
  }
}
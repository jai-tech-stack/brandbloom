import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const nextAuthHandler = NextAuth(authOptions);

async function withJsonError(
  req: Request,
  context: { params?: Promise<Record<string, string>> },
  method: "GET" | "POST"
) {
  try {
    return await nextAuthHandler(req, context as never);
  } catch (e) {
    console.error("[next-auth]", method, "error:", e);
    return NextResponse.json(
      { error: "SessionUnavailable", message: "Authentication request failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, context: { params?: Promise<Record<string, string>> }) {
  return withJsonError(req, context, "GET");
}

export async function POST(req: Request, context: { params?: Promise<Record<string, string>> }) {
  return withJsonError(req, context, "POST");
}

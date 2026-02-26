import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const nextAuthHandler = NextAuth(authOptions);

type RouteContext = { params: Promise<{ nextauth: string[] }> };

async function withJsonError(req: NextRequest, context: RouteContext, method: "GET" | "POST") {
  try {
    return await nextAuthHandler(req as never, context as never);
  } catch (e) {
    console.error("[next-auth]", method, "error:", e);
    return NextResponse.json(
      { error: "SessionUnavailable", message: "Authentication request failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
): Promise<Response> {
  return withJsonError(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
): Promise<Response> {
  return withJsonError(request, context, "POST");
}

import path from "path";
import { NextResponse } from "next/server";

function ensureEnv() {
  const token = (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();
  if (token) return;
  try {
    require("dotenv").config({ path: path.join(process.cwd(), ".env") });
  } catch {
    // ignore
  }
}
ensureEnv();

/** Exposes whether real image generation is available (no secrets). */
export async function GET() {
  const token = (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();
  const realImagesAvailable = !!token;
  const body: { realImagesAvailable: boolean; hint?: string } = { realImagesAvailable };
  if (!realImagesAvailable && process.env.NODE_ENV === "development")
    body.hint = "Add REPLICATE_API_TOKEN to the root .env (same folder as package.json) and restart: npm run dev";
  return NextResponse.json(body);
}

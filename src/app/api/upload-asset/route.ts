import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { prisma } from "@/lib/db";

/**
 * Upload / image-to-image: turn a user image into a branded asset.
 * Accepts image URL + brand context, calls Replicate img2img (Stability SD), returns result URL.
 */
const REPLICATE_TOKEN = () => (process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY ?? "").trim();

function buildPrompt(brand: { name?: string; colors?: string[]; description?: string } | null): string {
  const parts: string[] = [];
  if (brand?.name) parts.push(`Brand: ${brand.name}.`);
  if (brand?.colors?.length) parts.push(`Use these brand colors: ${brand.colors.slice(0, 5).join(", ")}.`);
  if (brand?.description) parts.push(brand.description.slice(0, 100));
  parts.push("Professional branded version, same composition, on-brand style, high quality.");
  return parts.join(" ");
}

/** Run replicate and return output typed as unknown to avoid SDK never-type inference. */
async function replicateRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replicate: { run: (...args: any[]) => Promise<any> },
  model: string,
  input: Record<string, unknown>
): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return replicate.run(model, { input });
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    if (user.credits < 1) {
      return NextResponse.json({ error: "Not enough credits. You need at least 1 credit." }, { status: 402 });
    }

    const body = await request.json();
    const { imageUrl, brand, prompt: customPrompt } = body as {
      imageUrl?: string;
      brand?: { name?: string; colors?: string[]; description?: string };
      prompt?: string;
    };

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "Missing imageUrl (public image URL)." }, { status: 400 });
    }

    const token = REPLICATE_TOKEN();
    if (!token) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN not set. Add it to root .env for upload." },
        { status: 503 }
      );
    }

    const prompt = (typeof customPrompt === "string" && customPrompt.trim())
      ? customPrompt.trim()
      : buildPrompt(brand ?? null);

    let url: string | null = null;
    try {
      const Replicate = (await import("replicate")).default;
      const replicate = new Replicate({ auth: token });
      // Use helper that returns Promise<unknown> to avoid SDK never-type inference
      const output: unknown = await replicateRun(replicate, "stability-ai/stable-diffusion-img2img", {
        image: imageUrl,
        prompt,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        prompt_strength: 0.8,
      });
      if (typeof output === "string" && output.startsWith("http")) url = output;
      else if (Array.isArray(output) && output[0] && typeof output[0] === "string") url = output[0] as string;
      else if (output && typeof (output as { url?: string }).url === "string") url = (output as { url: string }).url;
    } catch (sdkErr) {
      console.error("[upload-asset] Replicate SDK error:", (sdkErr as Error).message);
    }

    if (!url) {
      return NextResponse.json(
        { error: "Image processing did not return a result. Ensure the image URL is public." },
        { status: 502 }
      );
    }

    await prisma.$transaction([
      prisma.asset.create({
        data: {
          userId: user.id,
          brandId: null,
          url,
          label: "Uploaded (branded)",
          type: "social",
          width: 1024,
          height: 1024,
          prompt,
          aspectRatio: "1:1",
          model: "replicate/img2img",
          sourceIdea: "upload",
          brandSnapshot: brand ? JSON.stringify(brand) : null,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } },
      }),
    ]);

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true },
    });

    return NextResponse.json({ url, label: "Uploaded (branded)", credits: refreshed?.credits ?? 0 });
  } catch (e) {
    console.error("[upload-asset] error:", e);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
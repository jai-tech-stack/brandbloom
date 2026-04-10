import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { generateImageWithReplicate } from "@/lib/ai-generator";

const DEFAULT_RATIOS = ["1:1", "9:16", "16:9", "4:5", "2:3"] as const;

function ratioToSize(ratio: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "9:16": { width: 768, height: 1344 },
    "16:9": { width: 1344, height: 768 },
    "4:5": { width: 1024, height: 1280 },
    "2:3": { width: 832, height: 1248 },
    "3:4": { width: 896, height: 1152 },
    "21:9": { width: 1536, height: 640 },
  };
  return map[ratio] ?? map["1:1"];
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      assetId?: string;
      aspectRatios?: string[];
    };

    if (!body.assetId) {
      return NextResponse.json({ error: "assetId is required." }, { status: 400 });
    }

    const asset = await prisma.asset.findFirst({
      where: { id: body.assetId, userId: user.id },
      include: { brand: true },
    });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const token = (process.env.REPLICATE_API_TOKEN ?? "").trim();
    if (!token) {
      return NextResponse.json(
        { error: "Image generation is not configured." },
        { status: 503 }
      );
    }

    const ratios = (body.aspectRatios && body.aspectRatios.length > 0)
      ? body.aspectRatios
      : [...DEFAULT_RATIOS];

    const prompt = asset.prompt || asset.label || "Marketing asset";
    const created = [];

    for (const ratio of ratios.slice(0, 6)) {
      const imageUrl = await generateImageWithReplicate(token, prompt, ratio).catch(() => null);
      const { width, height } = ratioToSize(ratio);

      const newAsset = await prisma.asset.create({
        data: {
          userId: user.id,
          brandId: asset.brandId,
          url: imageUrl,
          label: `${asset.label} · ${ratio}`.slice(0, 200),
          type: asset.type ?? "social",
          width,
          height,
          prompt,
          aspectRatio: ratio,
          status: imageUrl ? "complete" : "failed",
          ideaType: asset.ideaType ?? undefined,
          sourceIdea: `variant:${asset.id}`,
        },
      });

      if (imageUrl) {
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { decrement: 2 } },
        }).catch(() => { /* non-fatal */ });
      }

      created.push(newAsset);
    }

    return NextResponse.json({ assets: created });
  } catch (e) {
    console.error("assets variations error:", e);
    return NextResponse.json({ error: "Failed to create variations." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthUser } from "@/lib/resolve-auth-user";
import { brandRowToIntelligence, brandIntelligencePersonalityString } from "@/lib/brand-intelligence";
import { generateStrategicCampaign, type BriefInput, type BrandProfileForStrategic } from "@/lib/agent/strategicCampaignGenerator";

const RECENT_PLAN_MS = 5000;
const recentPlanByUser = new Map<string, number>();

function getGoalFromBrief(brief: BriefInput): string {
  if (brief.type === "quick") return brief.description.slice(0, 500);
  return brief.goal;
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const now = Date.now();
    const last = recentPlanByUser.get(user.id);
    if (last != null && now - last < RECENT_PLAN_MS) {
      return NextResponse.json(
        { error: "Please wait a few seconds before creating another campaign plan." },
        { status: 429 }
      );
    }
    recentPlanByUser.set(user.id, now);

    const body = await request.json();
    const { brandId, brief, goal: urlFlowGoal, additionalPrompt } = body as {
      brandId?: string;
      brief?: BriefInput;
      goal?: string;
      additionalPrompt?: string;
    };

    if (!brandId || typeof brandId !== "string") {
      return NextResponse.json({ error: "brandId is required." }, { status: 400 });
    }

    const brandRow = await prisma.brand.findFirst({
      where: { id: brandId, userId: user.id },
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        personality: true,
        tone: true,
        toneOfVoice: true,
        visualStyle: true,
        industry: true,
        targetAudience: true,
        personalityTraits: true,
        sourceType: true,
      },
    });

    if (!brandRow) {
      return NextResponse.json({ error: "Brand not found or access denied." }, { status: 404 });
    }

    const sourceType = brandRow.sourceType === "logo" ? "logo" : "url";

    let effectiveBrief: BriefInput;
    if (sourceType === "logo") {
      if (!brief || (brief.type !== "quick" && brief.type !== "advanced")) {
        return NextResponse.json(
          { error: "Brief required for logo-based brands." },
          { status: 400 }
        );
      }
      if (brief.type === "quick") {
        if (typeof brief.description !== "string" || !brief.description.trim()) {
          return NextResponse.json(
            { error: "Brief required for logo-based brands." },
            { status: 400 }
          );
        }
        effectiveBrief = brief;
      } else {
        if (typeof brief.goal !== "string" || !Array.isArray(brief.platform) || typeof brief.timeline !== "string" || typeof brief.budget !== "string") {
          return NextResponse.json(
            { error: "Brief required for logo-based brands." },
            { status: 400 }
          );
        }
        effectiveBrief = brief;
      }
    } else {
      const goalText = (typeof urlFlowGoal === "string" && urlFlowGoal.trim()) ? urlFlowGoal.trim() : "Increase awareness and engagement";
      effectiveBrief = { type: "quick", description: goalText };
    }

    const bi = brandRowToIntelligence(brandRow as Parameters<typeof brandRowToIntelligence>[0]);
    const brandProfile: BrandProfileForStrategic = {
      name: brandRow.name,
      description: brandRow.description ?? undefined,
      tagline: brandRow.tagline ?? undefined,
      personality: brandIntelligencePersonalityString(bi) ?? brandRow.personality ?? undefined,
      tone: bi.toneOfVoice ?? brandRow.tone ?? undefined,
      visualStyle: bi.visualStyle ?? undefined,
      industry: brandRow.industry ?? undefined,
      targetAudience: brandRow.targetAudience ?? undefined,
    };

    const plan = await generateStrategicCampaign(
      brandProfile,
      effectiveBrief,
      typeof additionalPrompt === "string" ? additionalPrompt.trim() || undefined : undefined
    );
    const goal = getGoalFromBrief(effectiveBrief);
    const mode = effectiveBrief.type === "quick" ? "quick" : "advanced";

    const campaign = await prisma.$transaction(async (tx) => {
      const camp = await tx.campaign.create({
        data: {
          userId: user.id,
          brandId: brandRow.id,
          title: plan.campaignName.slice(0, 200),
          goal: goal.slice(0, 500),
          strategySummary: plan.strategySummary.slice(0, 2000),
          objective: plan.objective.slice(0, 500),
          mode,
          duration: plan.duration.slice(0, 100),
          status: "draft",
          assetPlanSnapshot: JSON.stringify(plan.assetPlan),
        },
      });

      for (let i = 0; i < plan.assetPlan.length; i++) {
        const item = plan.assetPlan[i];
        const label = `${item.assetType.replace(/_/g, " ")} · ${item.platform}`;
        await tx.asset.create({
          data: {
            userId: user.id,
            brandId: brandRow.id,
            campaignId: camp.id,
            url: null,
            label: label.slice(0, 200),
            type: "social",
            width: 1024,
            height: 1024,
            status: "pending",
            ideaType: item.assetType,
            blueprint: JSON.stringify({
              purpose: item.purpose,
              headlineConcept: item.headlineConcept,
              visualDirection: item.visualDirection,
              cta: item.cta,
              platform: item.platform,
            }),
          },
        });
      }

      return camp;
    });

    return NextResponse.json({
      campaignId: campaign.id,
      campaignName: plan.campaignName,
      objective: plan.objective,
      strategySummary: plan.strategySummary,
      duration: plan.duration,
      assetPlan: plan.assetPlan,
    });
  } catch (e) {
    console.error("[campaign/plan] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Campaign plan failed." },
      { status: 500 }
    );
  }
}

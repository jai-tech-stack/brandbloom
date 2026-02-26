/**
 * Campaign Planning Layer
 * Uses GPT to return a structured list of assets for a coordinated campaign.
 * 3–6 assets max, mix of channels. JSON only.
 */

export type CampaignAssetSpec = {
  ideaType: string;
  intent: string;
  priority: number;
};

export type CampaignPlan = {
  campaignTitle: string;
  strategySummary: string;
  assets: CampaignAssetSpec[];
};

export type BrandForPlanner = {
  name?: string;
  description?: string;
  tagline?: string;
  personality?: string;
  tone?: string;
  aestheticNarrative?: string;
  visualStyleSummary?: string;
  /** From strategy profile; campaign planning uses these for asset intent. */
  messagingAngles?: string[];
};

/** Optional output from AI Brand Strategist; when present, campaign plan aligns with strategy. */
export type StrategyBlueprintForPlanner = {
  emotionalTone?: string;
  targetPersona?: string;
  marketingObjective?: string;
  headlineStrategy?: string;
  ctaPsychology?: string;
  visualDirection?: string;
  contentAngles?: string[];
  suggestedVariations?: string[];
};

const CAMPAIGN_TYPES = ["launch", "announcement", "seasonal", "growth", "awareness", "conversion", "engagement"];

const SYSTEM_PROMPT = `You are a marketing campaign strategist.
Given a brand profile and campaign goal, return a structured list of assets required for a coordinated campaign.
Return JSON only. No markdown, no explanations.

Output exactly this structure:
{
  "campaignTitle": "short campaign name (3-6 words)",
  "strategySummary": "2-4 sentences describing the campaign approach and channel mix",
  "assets": [
    {
      "ideaType": "snake_case asset type, e.g. linkedin_post, instagram_story, youtube_thumbnail, display_ad, product_launch, facebook_post, pinterest_pin, linkedin_banner, newsletter, blog_hero_image",
      "intent": "one sentence creative intent for this asset (what message/visual to convey)",
      "priority": 1
    }
  ]
}

Rules:
- Include 3 to 6 assets only.
- Mix channels (e.g. LinkedIn, Instagram, Banner, Ad, Thumbnail).
- ideaType must be one of: linkedin_post, instagram_story, twitter_post, youtube_thumbnail, facebook_post, pinterest_pin, product_launch, event_invite, display_ad, social_media_ad, blog_hero_image, newsletter, linkedin_banner, youtube_channel_art, hero_product_shot, or similar snake_case from the platform.
- Ensure logical campaign flow (e.g. announce → social posts → banner).
- priority: 1 = highest, 2 = next, etc.
- Return only valid JSON.`;

function deterministicPlan(
  campaignGoal: string,
  campaignType: string,
  brand: BrandForPlanner | null
): CampaignPlan {
  const name = brand?.name ?? "Brand";
  const assets: CampaignAssetSpec[] = [
    { ideaType: "linkedin_post", intent: `Professional post for ${campaignGoal}`, priority: 1 },
    { ideaType: "instagram_story", intent: `Engaging story visual for ${campaignGoal}`, priority: 2 },
    { ideaType: "display_ad", intent: `Clear CTA and message for ${campaignGoal}`, priority: 3 },
  ].slice(0, 4);
  return {
    campaignTitle: `${name} – ${campaignType}`,
    strategySummary: `Coordinated ${campaignType} campaign: ${campaignGoal}. Mix of LinkedIn, Instagram, and display to reach the audience with a consistent message.`,
    assets,
  };
}

/**
 * Plan a full campaign: title, strategy summary, and 3–6 asset specs (ideaType + intent + priority).
 * If strategyBlueprint is provided (from AI Brand Strategist), the plan aligns with that strategy.
 */
export async function planCampaign(
  brand: BrandForPlanner | null,
  campaignGoal: string,
  campaignType: string,
  strategyBlueprint?: StrategyBlueprintForPlanner | null
): Promise<CampaignPlan> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const typeNorm = campaignType.trim().toLowerCase() || "growth";
  const goalTrim = campaignGoal.trim().slice(0, 500) || "Increase awareness and engagement";

  if (!apiKey) {
    return deterministicPlan(goalTrim, typeNorm, brand);
  }

  const strategyLines: string[] = [];
  if (strategyBlueprint) {
    if (strategyBlueprint.emotionalTone) strategyLines.push(`Strategic emotional tone: ${strategyBlueprint.emotionalTone}.`);
    if (strategyBlueprint.targetPersona) strategyLines.push(`Target persona: ${strategyBlueprint.targetPersona}.`);
    if (strategyBlueprint.visualDirection) strategyLines.push(`Visual direction: ${strategyBlueprint.visualDirection}.`);
    if (strategyBlueprint.contentAngles?.length) strategyLines.push(`Content angles (use in asset intents): ${strategyBlueprint.contentAngles.join("; ")}.`);
    if (strategyBlueprint.headlineStrategy) strategyLines.push(`Headline strategy: ${strategyBlueprint.headlineStrategy}.`);
    if (strategyBlueprint.ctaPsychology) strategyLines.push(`CTA approach: ${strategyBlueprint.ctaPsychology}.`);
  }

  const userContent = [
    `Brand: ${brand?.name ?? "Unknown"}.`,
    brand?.tagline ? `Tagline: ${brand.tagline}.` : "",
    brand?.description ? `Description: ${brand.description.slice(0, 300)}.` : "",
    brand?.aestheticNarrative ? `Style: ${brand.aestheticNarrative.slice(0, 200)}.` : "",
    brand?.messagingAngles?.length ? `Messaging angles: ${brand.messagingAngles.join("; ")}.` : "",
    ...strategyLines,
    `Campaign type: ${typeNorm}.`,
    `Campaign goal: ${goalTrim}.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (process.env.NODE_ENV === "development") console.warn("[CampaignPlanner] OpenAI error:", res.status, err.slice(0, 200));
      return deterministicPlan(goalTrim, typeNorm, brand);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return deterministicPlan(goalTrim, typeNorm, brand);

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const assetsRaw = Array.isArray(parsed.assets) ? parsed.assets : [];
    const assets: CampaignAssetSpec[] = assetsRaw
      .slice(0, 6)
      .map((a: unknown, i: number) => {
        const o = a as Record<string, unknown>;
        return {
          ideaType: typeof o.ideaType === "string" ? o.ideaType.replace(/\s+/g, "_").toLowerCase() : "linkedin_post",
          intent: typeof o.intent === "string" ? o.intent.slice(0, 300) : "",
          priority: typeof o.priority === "number" ? o.priority : i + 1,
        };
      })
      .filter((a) => a.ideaType && a.intent);

    if (assets.length < 3) {
      const fallback = deterministicPlan(goalTrim, typeNorm, brand);
      return { ...fallback, assets: fallback.assets.concat(assets).slice(0, 6) };
    }

    return {
      campaignTitle: typeof parsed.campaignTitle === "string" ? parsed.campaignTitle.slice(0, 120) : "Campaign",
      strategySummary: typeof parsed.strategySummary === "string" ? parsed.strategySummary.slice(0, 500) : "",
      assets,
    };
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.warn("[CampaignPlanner] GPT failed:", e);
    return deterministicPlan(goalTrim, typeNorm, brand);
  }
}

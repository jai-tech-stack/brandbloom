/**
 * Campaign Strategist Agent (AI CMO Brain)
 * Strategic layer before rendering: analyzes Brand Intelligence, determines objective,
 * messaging framework, emotional tone, and produces a structured creative blueprint
 * that is passed to the existing render engine. Does not modify the render engine.
 */

/** Structured output from the Campaign Strategist Agent. Passed to blueprint/render. */
export type CampaignBlueprintOutput = {
  objective: string;
  targetPersona: string;
  emotionalTone: string;
  messagingFramework: string;
  headline: string;
  subtext: string;
  cta: string;
  visualDirection: string;
  layoutType: string;
};

/** Brand context passed to the agent (subset of Brand Intelligence / orchestrator brand). */
export type BrandForCampaignAgent = {
  name?: string;
  tagline?: string;
  description?: string;
  personality?: string;
  tone?: string;
  visualStyleSummary?: string;
  targetAudience?: string;
  colors?: string[];
};

const SYSTEM_PROMPT = `You are an AI Chief Marketing Officer.

Use the provided Brand Intelligence.

Determine:
- The marketing objective
- The most effective messaging framework
- The emotional tone aligned with brand personality
- A compelling headline
- Supporting subtext
- A persuasive CTA
- Visual direction for background
- Recommended layout type

Output ONLY valid structured JSON.`;

const OUTPUT_SCHEMA = `{
  "objective": "awareness | engagement | conversion | retention",
  "targetPersona": "one sentence describing the target audience",
  "emotionalTone": "tone aligned with brand (e.g. professional, bold, warm)",
  "messagingFramework": "framework name or approach (e.g. AIDA, PAS, before-after-bridge)",
  "headline": "short punchy headline (3-8 words)",
  "subtext": "one line supporting copy (under 15 words)",
  "cta": "call-to-action text (2-5 words)",
  "visualDirection": "concrete visual description for background: composition, mood, style (1-2 sentences)",
  "layoutType": "e.g. top-heading, centered-vertical, bold-center, split-text-product"
}`;

function deterministicBlueprint(
  brand: BrandForCampaignAgent | null,
  userIntent: string,
  assetType: string
): CampaignBlueprintOutput {
  const name = brand?.name ?? "Brand";
  const tone = [brand?.tone, brand?.personality].filter(Boolean).join(", ") || "professional";
  const base = userIntent.trim() || assetType.replace(/_/g, " ");
  const headline = base.length > 50 ? base.slice(0, 47) + "..." : base || `${name} Spotlight`;
  return {
    objective: "engagement",
    targetPersona: brand?.targetAudience ?? "target audience",
    emotionalTone: tone.slice(0, 80),
    messagingFramework: "benefit-led",
    headline,
    subtext: brand?.tagline?.slice(0, 80) ?? `On-brand content for ${name}.`,
    cta: "Learn more",
    visualDirection: `Professional marketing background for ${assetType.replace(/_/g, " ")}: clear focal area, balanced composition, brand-aligned mood. No text, no logos.`,
    layoutType: "top-heading",
  };
}

/**
 * Generate a structured campaign blueprint from Brand Intelligence and user intent.
 * This runs before any rendering; the output is passed to the existing blueprint/render flow.
 */
export async function generateCampaignBlueprint(params: {
  brand: BrandForCampaignAgent | null;
  userIntent: string;
  assetType: string;
}): Promise<CampaignBlueprintOutput> {
  const { brand, userIntent, assetType } = params;
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const intentTrim = userIntent.trim().slice(0, 500);
  const assetTrim = assetType.trim().slice(0, 80);

  if (!apiKey) {
    return deterministicBlueprint(brand, intentTrim, assetTrim);
  }

  const brandContext = [
    `Brand: ${brand?.name ?? "Unknown"}.`,
    brand?.tagline ? `Tagline: ${brand.tagline}.` : "",
    brand?.description ? `Description: ${brand.description.slice(0, 300)}.` : "",
    brand?.personality ? `Personality: ${brand.personality}.` : "",
    brand?.tone ? `Tone: ${brand.tone}.` : "",
    brand?.visualStyleSummary ? `Visual style: ${brand.visualStyleSummary.slice(0, 200)}.` : "",
    brand?.targetAudience ? `Target audience: ${brand.targetAudience}.` : "",
    brand?.colors?.length ? `Brand colors: ${brand.colors.slice(0, 4).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userContent = [
    brandContext,
    `Asset type: ${assetTrim}.`,
    intentTrim ? `User intent / prompt: ${intentTrim}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

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
          { role: "system", content: `${SYSTEM_PROMPT}\n\nOutput this exact structure:\n${OUTPUT_SCHEMA}` },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (process.env.NODE_ENV === "development") console.warn("[CampaignAgent] OpenAI error:", res.status, err.slice(0, 200));
      return deterministicBlueprint(brand, intentTrim, assetTrim);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return deterministicBlueprint(brand, intentTrim, assetTrim);

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
    const obj = (v: unknown) => ["awareness", "engagement", "conversion", "retention"].includes(String(v)) ? String(v) : "engagement";

    return {
      objective: obj(parsed.objective),
      targetPersona: str(parsed.targetPersona, 200) || "Target audience.",
      emotionalTone: str(parsed.emotionalTone, 120) || "Professional.",
      messagingFramework: str(parsed.messagingFramework, 100) || "benefit-led",
      headline: str(parsed.headline, 120) || deterministicBlueprint(brand, intentTrim, assetTrim).headline,
      subtext: str(parsed.subtext, 150) || "",
      cta: str(parsed.cta, 60) || "Learn more",
      visualDirection: str(parsed.visualDirection, 300) || "Professional marketing background.",
      layoutType: str(parsed.layoutType, 60) || "top-heading",
    };
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.warn("[CampaignAgent] failed:", e);
    return deterministicBlueprint(brand, intentTrim, assetTrim);
  }
}

/** Strategy fields to persist on Asset (campaign memory). */
export type CampaignStrategyFields = {
  objective: string | null;
  messagingFramework: string | null;
  emotionalTone: string | null;
};

export function campaignBlueprintToStrategyFields(blueprint: CampaignBlueprintOutput): CampaignStrategyFields {
  return {
    objective: blueprint.objective || null,
    messagingFramework: blueprint.messagingFramework || null,
    emotionalTone: blueprint.emotionalTone || null,
  };
}

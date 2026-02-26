/**
 * Unified strategic campaign generator — plan only, no image generation.
 * Returns strict JSON (campaignName, objective, strategySummary, duration, assetPlan).
 * Validates with Zod; retries once on invalid JSON.
 */

import {
  parseStrategicCampaignOutput,
  type StrategicCampaignOutput,
  type AssetPlanItem,
} from "./strategicCampaignSchema";

export type QuickBrief = {
  type: "quick";
  description: string;
};

export type AdvancedBrief = {
  type: "advanced";
  goal: string;
  platform: string[];
  timeline: string;
  budget: string;
  description?: string;
};

export type BriefInput = QuickBrief | AdvancedBrief;

export type BrandProfileForStrategic = {
  name: string;
  description?: string | null;
  tagline?: string | null;
  personality?: string | null;
  tone?: string | null;
  visualStyle?: string | null;
  industry?: string | null;
  targetAudience?: string | null;
};

const OUTPUT_SCHEMA_TEXT = `Return ONLY a single JSON object with no markdown, no code fence, no explanation. Schema:
{
  "campaignName": "string (3-6 words)",
  "objective": "string (one sentence)",
  "strategySummary": "string (2-4 sentences)",
  "duration": "string (e.g. 1 week, 2 weeks, 1 month)",
  "assetPlan": [
    {
      "assetType": "string (e.g. linkedin_post, instagram_story)",
      "platform": "string (e.g. Instagram, LinkedIn)",
      "purpose": "string (why this asset exists for the campaign)",
      "headlineConcept": "string (main headline idea)",
      "visualDirection": "string (mood, composition, no text in image)",
      "cta": "string (call to action)"
    }
  ]
}
Include 3 to 6 items in assetPlan. assetType must be snake_case (e.g. linkedin_post, instagram_story, youtube_thumbnail, facebook_post, pinterest_pin).`;

function buildUserPrompt(brand: BrandProfileForStrategic, brief: BriefInput): string {
  const brandBlock = [
    `Brand: ${brand.name}.`,
    brand.tagline ? `Tagline: ${brand.tagline}.` : "",
    brand.description ? `Description: ${brand.description.slice(0, 400)}.` : "",
    brand.personality ? `Personality: ${brand.personality}.` : "",
    brand.tone ? `Tone: ${brand.tone}.` : "",
    brand.visualStyle ? `Visual style: ${brand.visualStyle}.` : "",
    brand.industry ? `Industry: ${brand.industry}.` : "",
    brand.targetAudience ? `Target audience: ${brand.targetAudience}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (brief.type === "quick") {
    return `${brandBlock}\n\nCampaign brief (user goal):\n${brief.description.trim().slice(0, 800)}\n\n${OUTPUT_SCHEMA_TEXT}`;
  }

  const adv = brief;
  const platformList = Array.isArray(adv.platform) && adv.platform.length > 0
    ? adv.platform.join(", ")
    : "Multi-platform";
  return [
    brandBlock,
    "",
    "Structured brief:",
    `Goal: ${adv.goal}.`,
    `Platform(s): ${platformList}.`,
    `Timeline: ${adv.timeline}.`,
    `Budget: ${adv.budget}.`,
    adv.description?.trim() ? `Additional context: ${adv.description.slice(0, 400)}.` : "",
    "",
    OUTPUT_SCHEMA_TEXT,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJsonFromResponse(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").trim();
  const start = trimmed.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === "{") depth++;
    else if (trimmed[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(trimmed.slice(start, i + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function callModel(systemPrompt: string, userContent: string): Promise<string> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for strategic campaign generation.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty response from OpenAI");
  return raw;
}

const SYSTEM_PROMPT = `You are an AI Marketing Strategist. Given a brand profile and a campaign brief, output a structured campaign plan as a single JSON object. No markdown, no code block, no explanation—only valid JSON. Each asset in assetPlan must have: assetType (snake_case), platform, purpose (why this asset exists), headlineConcept, visualDirection (no text in image), cta.`;

/**
 * Generate a strategic campaign plan (no images). Validates with Zod; retries once on invalid output.
 */
export async function generateStrategicCampaign(
  brandProfile: BrandProfileForStrategic,
  briefInput: BriefInput
): Promise<StrategicCampaignOutput> {
  const userContent = buildUserPrompt(brandProfile, briefInput);

  const run = async (retryWithStrict = false): Promise<StrategicCampaignOutput | null> => {
    const system = retryWithStrict
      ? `${SYSTEM_PROMPT} The previous response was invalid. Return only valid JSON matching the exact schema: campaignName, objective, strategySummary, duration, assetPlan array with objects containing assetType, platform, purpose, headlineConcept, visualDirection, cta.`
      : SYSTEM_PROMPT;
    const raw = await callModel(system, userContent);
    const parsed = extractJsonFromResponse(raw) ?? (raw ? JSON.parse(raw) : null);
    return parseStrategicCampaignOutput(parsed);
  };

  let result = await run(false);
  if (result) return result;
  result = await run(true);
  if (result) return result;

  // Fallback deterministic plan
  const goal = briefInput.type === "quick" ? briefInput.description.slice(0, 200) : briefInput.goal;
  const fallback: StrategicCampaignOutput = {
    campaignName: `${brandProfile.name} Campaign`,
    objective: goal.slice(0, 120),
    strategySummary: `Campaign aligned with ${brandProfile.name}: ${goal.slice(0, 150)}.`,
    duration: briefInput.type === "advanced" ? briefInput.timeline : "2 weeks",
    assetPlan: [
      { assetType: "linkedin_post", platform: "LinkedIn", purpose: "Professional reach and authority.", headlineConcept: "Key message headline", visualDirection: "Clean, professional layout", cta: "Learn more" },
      { assetType: "instagram_story", platform: "Instagram", purpose: "Engagement and visibility.", headlineConcept: "Engaging hook", visualDirection: "Vertical, bold visuals", cta: "Swipe up" },
      { assetType: "display_ad", platform: "Multi-platform", purpose: "Conversion and awareness.", headlineConcept: "Clear value prop", visualDirection: "High contrast, focal CTA", cta: "Get started" },
    ] as AssetPlanItem[],
  };
  return fallback;
}

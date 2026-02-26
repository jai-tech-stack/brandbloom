/**
 * AI Brand Strategist Agent
 * Thinks like a CMO: uses Brand Intelligence to decide emotional tone, target persona,
 * marketing objective, headline strategy, CTA psychology, visual direction.
 * Outputs a structured Strategic Blueprint that feeds campaign planning and creative execution.
 */

import type { BrandIntelligence } from "@/lib/brand-intelligence";
import { brandIntelligenceColors, brandIntelligencePersonalityString } from "@/lib/brand-intelligence";

export type StrategicBlueprint = {
  /** Emotional tone for the campaign or asset (e.g. "Confident and aspirational") */
  emotionalTone: string;
  /** Target persona summary (e.g. "B2B decision-makers seeking efficiency") */
  targetPersona: string;
  /** Marketing objective (e.g. "Drive awareness and consideration") */
  marketingObjective: string;
  /** Headline strategy (e.g. "Lead with benefit, follow with proof") */
  headlineStrategy: string;
  /** CTA psychology (e.g. "Low friction, single clear action") */
  ctaPsychology: string;
  /** Visual direction for creatives (composition, mood, style) */
  visualDirection: string;
  /** 2–4 content angles or messaging hooks */
  contentAngles: string[];
  /** Optional: 2–3 suggested headline/visual variations */
  suggestedVariations?: string[];
};

const SYSTEM_PROMPT = `You are an AI Brand Strategist. You think like a CMO.
Your job is to use the Brand Intelligence object and the user's intent to produce a structured strategic blueprint.

Decide:
- Emotional tone (how the brand should feel in this context)
- Target persona (who we're speaking to)
- Marketing objective (what we're trying to achieve)
- Headline strategy (how to craft the main message)
- CTA psychology (how the call-to-action should work)
- Visual direction (mood, composition, style for creatives)
- Content angles (2–4 messaging hooks or themes)
- Optional: 2–3 suggested headline/visual variations

Output ONLY valid JSON in this exact structure (no markdown, no explanation):
{
  "emotionalTone": "one short phrase or sentence",
  "targetPersona": "one sentence describing the audience",
  "marketingObjective": "one sentence",
  "headlineStrategy": "one sentence",
  "ctaPsychology": "one sentence",
  "visualDirection": "1-2 sentences: composition, mood, style",
  "contentAngles": ["angle1", "angle2", "angle3"],
  "suggestedVariations": ["variation1", "variation2"]
}

Rules:
- Be specific to the brand and the intent. No generic filler.
- contentAngles: 2–4 items. suggestedVariations: 2–3 items (optional).
- Return only valid JSON.`;

function deterministicBlueprint(
  brand: BrandIntelligence | null,
  intent: string,
  context: string
): StrategicBlueprint {
  const name = brand?.brandName ?? "Brand";
  const persona = brand?.targetAudience ?? "target audience";
  const tone = brand?.toneOfVoice ?? brandIntelligencePersonalityString(brand ?? null) ?? "professional";
  const base = intent.trim() || context.trim() || "campaign";
  return {
    emotionalTone: `${tone}; on-brand for ${name}.`,
    targetPersona: persona || "Professional audience.",
    marketingObjective: `Support goals for ${base}.`,
    headlineStrategy: "Lead with clear benefit; keep under 8 words.",
    ctaPsychology: "Single clear action; low friction.",
    visualDirection: `Professional marketing layout for ${base}: clear focal area, balanced composition, brand-aligned mood.`,
    contentAngles: [`${name} value proposition`, `Audience relevance`, `Clear outcome`],
    suggestedVariations: [`${base} – ${name}`, `Why ${name} for ${persona}`],
  };
}

/**
 * Produce a Strategic Blueprint from Brand Intelligence and user intent.
 * Use this before campaign planning or asset generation so strategy drives creative.
 */
export async function runBrandStrategist(
  brand: BrandIntelligence | null,
  userIntent: string,
  context?: string
): Promise<StrategicBlueprint> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const intentTrim = userIntent.trim().slice(0, 500) || "Launch campaign";
  const contextTrim = (context ?? "").trim().slice(0, 300);

  if (!apiKey) {
    return deterministicBlueprint(brand, intentTrim, contextTrim);
  }

  const colors = brand ? brandIntelligenceColors(brand).slice(0, 4) : [];
  const personalityStr = brand ? brandIntelligencePersonalityString(brand) : null;
  const brandContext = [
    `Brand: ${brand?.brandName ?? "Unknown"}.`,
    brand?.tagline ? `Tagline: ${brand.tagline}.` : "",
    brand?.toneOfVoice ? `Tone of voice: ${brand.toneOfVoice}.` : "",
    personalityStr ? `Personality: ${personalityStr}.` : "",
    brand?.targetAudience ? `Target audience: ${brand.targetAudience}.` : "",
    brand?.industry ? `Industry: ${brand.industry}.` : "",
    brand?.visualStyle ? `Visual style: ${brand.visualStyle}.` : "",
    brand?.brandArchetype ? `Archetype: ${brand.brandArchetype}.` : "",
    colors.length ? `Brand colors: ${colors.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userContent = [
    brandContext,
    `User intent: ${intentTrim}.`,
    contextTrim ? `Context: ${contextTrim}.` : "",
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (process.env.NODE_ENV === "development") console.warn("[BrandStrategist] OpenAI error:", res.status, err.slice(0, 200));
      return deterministicBlueprint(brand, intentTrim, contextTrim);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return deterministicBlueprint(brand, intentTrim, contextTrim);

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 6) : [];

    return {
      emotionalTone: str(parsed.emotionalTone, 200) || "Professional and on-brand.",
      targetPersona: str(parsed.targetPersona, 200) || "Target audience.",
      marketingObjective: str(parsed.marketingObjective, 200) || "Support campaign goals.",
      headlineStrategy: str(parsed.headlineStrategy, 200) || "Clear, benefit-led headline.",
      ctaPsychology: str(parsed.ctaPsychology, 200) || "Single clear action.",
      visualDirection: str(parsed.visualDirection, 300) || "Professional marketing layout.",
      contentAngles: arr(parsed.contentAngles).slice(0, 4),
      suggestedVariations: arr(parsed.suggestedVariations).slice(0, 3),
    };
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.warn("[BrandStrategist] failed:", e);
    return deterministicBlueprint(brand, intentTrim, contextTrim);
  }
}

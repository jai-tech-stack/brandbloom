/**
 * Intent Interpretation Layer
 * Takes brand, ideaType, userPrompt → returns structured JSON for layout planning.
 * Uses GPT when OPENAI_API_KEY is set; otherwise deterministic fallback.
 */

export type IntentOutput = {
  headline: string;
  subtext: string;
  cta: string;
  visualDirection: string;
  toneAdjustment: string;
};

export type StrategyProfileForIntent = {
  positioning?: { category?: string; differentiation?: string; marketLevel?: string };
  brandArchetype?: string;
  toneSpectrum?: { formalToCasual?: number; playfulToSerious?: number; modernToClassic?: number };
  contentPillars?: string[];
};

export type BrandForIntent = {
  name?: string;
  tagline?: string;
  description?: string;
  personality?: string;
  tone?: string;
  aestheticNarrative?: string;
  visualStyleSummary?: string;
  strategyProfile?: StrategyProfileForIntent | null;
};

const SYSTEM_PROMPT = `You are a marketing layout planner. Your job is to return structured JSON only—no markdown, no explanation.
Given a brand, an asset type (ideaType), and optional user prompt, output exactly this JSON structure:
{
  "headline": "short punchy headline (3-8 words)",
  "subtext": "one line supporting copy (under 15 words)",
  "cta": "call-to-action text (2-5 words)",
  "visualDirection": "concrete visual description: composition, focal point, mood (1-2 sentences)",
  "toneAdjustment": "tone descriptor for the piece: e.g. professional, bold, warm, premium"
}
Rules: headline and cta must be concise. visualDirection must describe a full marketing layout (not a logo). Return only valid JSON.`;

function deterministicIntent(
  ideaType: string,
  userPrompt: string,
  brand: BrandForIntent | null
): IntentOutput {
  const name = brand?.name ?? "Brand";
  const tone = [brand?.tone, brand?.personality].filter(Boolean).join(", ") || "professional";
  const base = userPrompt.trim() || ideaType.replace(/_/g, " ");
  const headline = base.length > 40 ? base.slice(0, 37) + "..." : base || `${name} Spotlight`;
  return {
    headline,
    subtext: brand?.tagline?.slice(0, 80) || `On-brand content for ${name}.`,
    cta: "Learn more",
    visualDirection: `Full marketing layout for ${ideaType.replace(/_/g, " ")}: clear focal area, supporting text zones, balanced composition. Not a logo or isolated mark.`,
    toneAdjustment: tone.slice(0, 60),
  };
}

/**
 * Interpret user + brand + idea type into structured intent (JSON only).
 * Uses GPT when OPENAI_API_KEY is set; otherwise returns deterministic intent.
 */
export async function interpretIntent(
  brand: BrandForIntent | null,
  ideaType: string,
  userPrompt: string
): Promise<IntentOutput> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    return deterministicIntent(ideaType, userPrompt, brand);
  }

  const sp = brand?.strategyProfile;
  const strategyLines: string[] = [];
  if (sp?.positioning?.differentiation) strategyLines.push(`Positioning: ${sp.positioning.differentiation}.`);
  if (sp?.positioning?.category) strategyLines.push(`Category: ${sp.positioning.category}.`);
  if (sp?.brandArchetype) strategyLines.push(`Brand archetype: ${sp.brandArchetype}.`);
  if (sp?.toneSpectrum) {
    strategyLines.push(`Tone: formal-casual ${sp.toneSpectrum.formalToCasual ?? 5}/10, playful-serious ${sp.toneSpectrum.playfulToSerious ?? 5}/10, modern-classic ${sp.toneSpectrum.modernToClassic ?? 5}/10.`);
  }
  if (sp?.contentPillars?.length) strategyLines.push(`Content pillars: ${sp.contentPillars.slice(0, 4).join(", ")}.`);

  const userContent = [
    `Brand: ${brand?.name ?? "Unknown"}.`,
    brand?.tagline ? `Tagline: ${brand.tagline}.` : "",
    brand?.description ? `Description: ${brand.description.slice(0, 200)}.` : "",
    brand?.aestheticNarrative ? `Style: ${brand.aestheticNarrative.slice(0, 150)}.` : "",
    ...strategyLines,
    `Asset type (ideaType): ${ideaType}.`,
    userPrompt.trim() ? `User prompt: ${userPrompt.trim()}.` : "",
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
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (process.env.NODE_ENV === "development") console.warn("[Intent] OpenAI error:", res.status, err.slice(0, 200));
      return deterministicIntent(ideaType, userPrompt, brand);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return deterministicIntent(ideaType, userPrompt, brand);

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      headline: typeof parsed.headline === "string" ? parsed.headline : deterministicIntent(ideaType, userPrompt, brand).headline,
      subtext: typeof parsed.subtext === "string" ? parsed.subtext : "",
      cta: typeof parsed.cta === "string" ? parsed.cta : "Learn more",
      visualDirection: typeof parsed.visualDirection === "string" ? parsed.visualDirection : "",
      toneAdjustment: typeof parsed.toneAdjustment === "string" ? parsed.toneAdjustment : "professional",
    };
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.warn("[Intent] GPT parse/request failed:", e);
    return deterministicIntent(ideaType, userPrompt, brand);
  }
}

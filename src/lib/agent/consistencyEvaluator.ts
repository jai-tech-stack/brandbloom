/**
 * Consistency Evaluator
 * After generating campaign assets, score how consistent they are with the brand strategy.
 * Returns overallScore (1–10) and dimension scores + recommendations. JSON only.
 */

export type ConsistencyResult = {
  overallScore: number;
  colorConsistency: number;
  toneConsistency: number;
  visualConsistency: number;
  recommendations: string[];
};

export type AssetForEvaluation = {
  label: string;
  ideaType?: string | null;
  finalPrompt?: string | null;
};

export type BrandForEvaluation = {
  name?: string;
  tagline?: string;
  description?: string;
  colors?: string[];
  tone?: string;
  personality?: string;
  aestheticNarrative?: string;
};

const SYSTEM_PROMPT = `You are a brand consistency auditor.
Given a brand strategy profile and a list of generated campaign assets (with their prompts/labels), score how consistent these assets are with the brand.
Return JSON only. No markdown, no explanation.

Output exactly this structure:
{
  "overallScore": 7,
  "colorConsistency": 7,
  "toneConsistency": 8,
  "visualConsistency": 7,
  "recommendations": ["One short recommendation", "Another if needed"]
}

- overallScore: 1–10, how well the set fits the brand overall.
- colorConsistency: 1–10.
- toneConsistency: 1–10.
- visualConsistency: 1–10.
- recommendations: array of 0–4 short strings (one line each).
Return only valid JSON.`;

function deterministicScore(): ConsistencyResult {
  return {
    overallScore: 7,
    colorConsistency: 7,
    toneConsistency: 7,
    visualConsistency: 7,
    recommendations: ["Keep campaign messaging aligned across assets.", "Reuse brand colors in all creatives."],
  };
}

/**
 * Evaluate consistency of campaign assets with the brand. Returns scores and recommendations.
 */
export async function evaluateConsistency(
  assets: AssetForEvaluation[],
  brand: BrandForEvaluation | null
): Promise<ConsistencyResult> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey || assets.length === 0) return deterministicScore();

  const brandSummary = [
    brand?.name ? `Brand: ${brand.name}.` : "",
    brand?.tagline ? `Tagline: ${brand.tagline}.` : "",
    brand?.description ? `Description: ${brand.description.slice(0, 200)}.` : "",
    brand?.tone ? `Tone: ${brand.tone}.` : "",
    brand?.aestheticNarrative ? `Style: ${brand.aestheticNarrative.slice(0, 150)}.` : "",
    brand?.colors?.length ? `Colors: ${brand.colors.slice(0, 5).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const assetsSummary = assets
    .map((a, i) => `Asset ${i + 1}: ${a.label}; type: ${a.ideaType ?? "n/a"}; prompt: ${(a.finalPrompt ?? "").slice(0, 150)}.`)
    .join("\n");

  const userContent = `Brand profile:\n${brandSummary}\n\nGenerated assets:\n${assetsSummary}\n\nScore consistency 1–10 and give short recommendations.`;

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
        temperature: 0.3,
      }),
    });

    if (!res.ok) return deterministicScore();

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return deterministicScore();

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const num = (v: unknown): number => (typeof v === "number" && v >= 1 && v <= 10 ? v : 7);
    const recs = Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as unknown[]).filter((r): r is string => typeof r === "string").slice(0, 4)
      : [];

    return {
      overallScore: num(parsed.overallScore),
      colorConsistency: num(parsed.colorConsistency),
      toneConsistency: num(parsed.toneConsistency),
      visualConsistency: num(parsed.visualConsistency),
      recommendations: recs,
    };
  } catch {
    return deterministicScore();
  }
}

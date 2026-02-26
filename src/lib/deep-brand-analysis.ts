/**
 * Deep LLM brand analysis — structured "Brand DNA" from scraped data + page content.
 * Uses stronger models (gpt-4o / claude-3-5-sonnet) for values, audience, visual style, key messages, aesthetic narrative.
 */

import type { JsonLdBrand } from "@/lib/brand-scraper";

export type BrandDNA = {
  personality?: string;
  tone?: string;
  /** 3–6 brand values (e.g. Innovation, Trust, Simplicity). */
  values?: string[];
  /** Target audience in one sentence. */
  targetAudience?: string;
  /** Visual style in one sentence (mood, layout, typography feel). */
  visualStyleSummary?: string;
  /** 2–4 key messaging pillars. */
  keyMessages?: string[];
  /** Tone keywords for chips (e.g. Modern, Warm, Professional). */
  toneKeywords?: string[];
  /** 2–3 sentence narrative that synthesizes brand aesthetic for asset generation. */
  aestheticNarrative?: string;
};

export type DeepAnalysisInput = {
  name: string;
  description: string;
  tagline: string;
  colors: string[];
  fonts?: string[];
  /** First ~2500 chars of visible page text. */
  pageTextExcerpt?: string;
  metaKeywords?: string[];
  jsonLd?: JsonLdBrand | null;
};

const DEEP_SYSTEM = `You are an expert brand strategist and design analyst. Your task is to produce a structured "Brand DNA" from the provided brand and page data. Be precise and evidence-based: infer only from the given text and metadata; do not invent. Output valid JSON only, no markdown or explanation.

Output schema (use exactly these keys; omit a key if you cannot infer it):
- personality: string, 1-2 sentences.
- tone: string, one short sentence.
- values: string[], 3-6 brand values (e.g. Innovation, Trust, Simplicity).
- targetAudience: string, one sentence describing who the brand serves.
- visualStyleSummary: string, one sentence on visual style (mood, layout, typography).
- keyMessages: string[], 2-4 key messaging pillars.
- toneKeywords: string[], 4-8 adjectives for tone (e.g. Modern, Warm, Professional).
- aestheticNarrative: string, 2-3 sentences that synthesize the brand aesthetic for use in image generation prompts (colors, mood, typography, feeling).`;

function buildDeepUserPrompt(input: DeepAnalysisInput): string {
  const parts: string[] = [
    `Brand name: ${input.name}`,
    `Tagline: ${input.tagline || "(none)"}`,
    `Description: ${input.description || "(none)"}`,
    `Colors (hex): ${(input.colors || []).join(", ") || "(none)"}`,
    `Fonts: ${(input.fonts || []).join(", ") || "(none)"}`,
  ];
  if (input.metaKeywords?.length) {
    parts.push(`Meta keywords: ${input.metaKeywords.join(", ")}`);
  }
  if (input.jsonLd?.description) {
    parts.push(`Structured data description: ${input.jsonLd.description.slice(0, 300)}`);
  }
  if (input.pageTextExcerpt?.trim()) {
    parts.push(`\nPage content excerpt (use for values, audience, messages):\n${input.pageTextExcerpt.trim().slice(0, 2400)}`);
  }
  return parts.join("\n");
}

function parseDeepResponse(content: string): BrandDNA {
  const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.slice(0, max) : undefined;
  return {
    personality: str(parsed.personality, 250),
    tone: str(parsed.tone, 120),
    values: arr(parsed.values).slice(0, 6),
    targetAudience: str(parsed.targetAudience, 200),
    visualStyleSummary: str(parsed.visualStyleSummary, 200),
    keyMessages: arr(parsed.keyMessages).slice(0, 4),
    toneKeywords: arr(parsed.toneKeywords).slice(0, 8),
    aestheticNarrative: str(parsed.aestheticNarrative, 450),
  };
}

async function deepAnalyzeWithOpenAI(input: DeepAnalysisInput): Promise<BrandDNA> {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!key) return {};

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: DEEP_SYSTEM },
        { role: "user", content: buildDeepUserPrompt(input) },
      ],
      max_tokens: 700,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) return {};
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return {};
  return parseDeepResponse(content);
}

async function deepAnalyzeWithAnthropic(input: DeepAnalysisInput): Promise<BrandDNA> {
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!key) return {};

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 700,
      system: DEEP_SYSTEM,
      messages: [{ role: "user", content: buildDeepUserPrompt(input) }],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) return {};
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) return {};
  return parseDeepResponse(text);
}

/**
 * Run deep brand analysis: OpenAI (gpt-4o) first, then Anthropic (claude-sonnet-4).
 * Returns structured Brand DNA for use in prompts and UI.
 */
export async function deepBrandAnalysis(input: DeepAnalysisInput): Promise<BrandDNA> {
  const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const anthropicKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();

  if (openaiKey) {
    try {
      const result = await deepAnalyzeWithOpenAI(input);
      if (Object.keys(result).length > 0) return result;
    } catch {
      // fall through
    }
  }
  if (anthropicKey) {
    try {
      return await deepAnalyzeWithAnthropic(input);
    } catch {
      return {};
    }
  }
  return {};
}

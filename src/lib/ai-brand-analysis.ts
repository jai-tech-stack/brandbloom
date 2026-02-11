/**
 * Optional AI brand analysis — LLM provider: OpenAI (GPT) or Anthropic (Claude).
 * Infers personality and tone from scraped brand data. Uses OPENAI_API_KEY first, then ANTHROPIC_API_KEY.
 */

export type BrandAnalysis = {
  personality?: string;
  tone?: string;
};

type ScrapedForAnalysis = {
  name: string;
  description: string;
  tagline: string;
  colors: string[];
};

const SYSTEM_PROMPT = `You are a brand strategist. Based only on the brand info given, reply with 1-2 short sentences for "personality" and 1 short sentence for "tone". Be concise. Reply in JSON only, with keys "personality" and "tone". Example: {"personality": "Professional and approachable.", "tone": "Friendly and clear."}`;

function buildUserPrompt(brand: ScrapedForAnalysis): string {
  return `Brand name: ${brand.name}
Tagline: ${brand.tagline || "(none)"}
Description: ${brand.description || "(none)"}
Colors: ${(brand.colors || []).join(", ") || "(none)"}`;
}

function parseResponse(content: string): BrandAnalysis {
  const parsed = JSON.parse(content) as BrandAnalysis;
  return {
    personality: typeof parsed.personality === "string" ? parsed.personality.slice(0, 200) : undefined,
    tone: typeof parsed.tone === "string" ? parsed.tone.slice(0, 120) : undefined,
  };
}

/** Call OpenAI (GPT) for brand personality and tone. */
async function analyzeWithOpenAI(brand: ScrapedForAnalysis): Promise<BrandAnalysis> {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!key) return {};

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(brand) },
      ],
      max_tokens: 150,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return {};
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return {};
  return parseResponse(content);
}

/** Call Anthropic (Claude) for brand personality and tone. */
async function analyzeWithAnthropic(brand: ScrapedForAnalysis): Promise<BrandAnalysis> {
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!key) return {};

  const res = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(brand) }],
      }),
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) return {};
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) return {};
  return parseResponse(text);
}

/**
 * Run LLM brand analysis: tries OpenAI (GPT) first, then Anthropic (Claude).
 * Returns empty object if neither key is set or on error.
 */
export async function analyzeBrandWithAI(brand: ScrapedForAnalysis): Promise<BrandAnalysis> {
  const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const anthropicKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();

  if (openaiKey) {
    try {
      const result = await analyzeWithOpenAI(brand);
      if (result.personality || result.tone) return result;
    } catch {
      // fall through to Anthropic
    }
  }
  if (anthropicKey) {
    try {
      return await analyzeWithAnthropic(brand);
    } catch {
      return {};
    }
  }
  return {};
}

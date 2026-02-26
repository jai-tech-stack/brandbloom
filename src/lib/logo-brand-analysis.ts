/**
 * Logo-based brand intelligence — vision AI analyzes a logo image and returns structured Brand Intelligence.
 * Used only by the "Start with Logo" flow. Does not touch URL extraction.
 */

export type LogoBrandIntelligence = {
  brandName: string;
  primaryColor: string;
  secondaryColors: string[];
  suggestedFonts: { heading: string; body: string };
  brandPersonality: string[];
  toneOfVoice: string;
  industryGuess: string;
  visualStyle: string;
  targetAudienceGuess: string;
  taglineSuggestions: string[];
  brandStory: string;
  mission: string;
  vision: string;
};

const SCHEMA_PROMPT = `Analyze this brand logo image and return a JSON object with exactly these keys (use empty string or empty array if uncertain):
- brandName: string
- primaryColor: string (hex, e.g. #1a1a1a)
- secondaryColors: string[] (hex values, max 5)
- suggestedFonts: { heading: string, body: string } (font names)
- brandPersonality: string[] (3-6 adjectives)
- toneOfVoice: string (one short sentence)
- industryGuess: string
- visualStyle: string (one sentence)
- targetAudienceGuess: string
- taglineSuggestions: string[] (2-4 options)
- brandStory: string (2-3 sentences)
- mission: string
- vision: string
Return only valid JSON, no markdown or explanation.`;

/** Extract first complete JSON object from string (handles trailing text from the model). */
function extractJsonObject(raw: string): string {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return cleaned;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return cleaned.slice(start);
}

function parseResponse(content: string): LogoBrandIntelligence {
  const jsonStr = extractJsonObject(content);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  const obj = (v: unknown): { heading: string; body: string } =>
    v && typeof v === "object" && !Array.isArray(v)
      ? {
          heading: str((v as Record<string, unknown>).heading, 80),
          body: str((v as Record<string, unknown>).body, 80),
        }
      : { heading: "", body: "" };
  return {
    brandName: str(parsed.brandName, 120) || "My Brand",
    primaryColor: str(parsed.primaryColor, 20) || "#111111",
    secondaryColors: arr(parsed.secondaryColors).slice(0, 5),
    suggestedFonts: obj(parsed.suggestedFonts),
    brandPersonality: arr(parsed.brandPersonality).slice(0, 6),
    toneOfVoice: str(parsed.toneOfVoice, 200),
    industryGuess: str(parsed.industryGuess, 100),
    visualStyle: str(parsed.visualStyle, 200),
    targetAudienceGuess: str(parsed.targetAudienceGuess, 200),
    taglineSuggestions: arr(parsed.taglineSuggestions).slice(0, 4),
    brandStory: str(parsed.brandStory, 500),
    mission: str(parsed.mission, 300),
    vision: str(parsed.vision, 300),
  };
}

/** Thrown when OPENAI_API_KEY is not set (logo analysis requires OpenAI vision). */
export class OpenAIKeyRequiredError extends Error {
  constructor() {
    super("OPENAI_API_KEY is required for logo-based brand extraction. Add it to your .env.");
    this.name = "OpenAIKeyRequiredError";
  }
}

/**
 * Call OpenAI vision (gpt-4o) with the logo image and return Brand Intelligence.
 * Logo can be base64 data URL or public image URL.
 * Requires OPENAI_API_KEY to be set.
 */
export async function analyzeLogoWithVision(
  imageSource: string
): Promise<LogoBrandIntelligence> {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!key) {
    throw new OpenAIKeyRequiredError();
  }

  const isUrl = imageSource.startsWith("http");
  const messageContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    { type: "text", text: SCHEMA_PROMPT },
  ];
  if (isUrl) {
    messageContent.push({ type: "image_url", image_url: { url: imageSource } });
  } else {
    messageContent.push({ type: "image_url", image_url: { url: imageSource } });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI vision failed: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenAI response");
  return parseResponse(content);
}

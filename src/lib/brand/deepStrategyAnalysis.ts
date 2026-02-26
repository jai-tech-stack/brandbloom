/**
 * AI Brand Strategy Deep Intelligence
 * Produces a structured strategic brand profile from scraped site + extracted brand kit.
 * Used for generation (intent, prompts, campaigns) and Brand Strategy Intelligence UI.
 */

export type AudienceProfile = {
  primaryAudience: string;
  secondaryAudience: string;
  painPoints: string[];
  motivations: string[];
};

export type Positioning = {
  category: string;
  differentiation: string;
  marketLevel: "premium" | "mid-market" | "budget";
};

export type ToneSpectrum = {
  formalToCasual: number;
  playfulToSerious: number;
  modernToClassic: number;
};

export type VisualDNA = {
  style: string;
  designDensity: "minimal" | "balanced" | "bold";
  colorEnergy: "soft" | "vibrant" | "neutral";
};

export type StrategicProfile = {
  audienceProfile: AudienceProfile;
  positioning: Positioning;
  brandArchetype: string;
  toneSpectrum: ToneSpectrum;
  visualDNA: VisualDNA;
  messagingAngles: string[];
  contentPillars: string[];
};

export type DeepStrategyInput = {
  /** Website / page text (hero, about, products combined or excerpt) */
  websiteScrapedText?: string;
  /** First fold / hero emphasis (optional) */
  heroSection?: string;
  /** About / company section (optional) */
  aboutSection?: string;
  /** Product or service descriptions (optional) */
  productDescriptions?: string;
  /** Visual cues: colors, fonts, style notes */
  visualCues?: string;
  /** Extracted brand kit summary */
  name: string;
  description?: string;
  tagline?: string;
  colors?: string[];
  fonts?: string[];
  /** Existing deep analysis narrative (if any) */
  aestheticNarrative?: string;
  targetAudience?: string;
  personality?: string;
  tone?: string;
};

const SYSTEM_PROMPT = `You are a senior brand strategist.
Analyze this company and produce a structured strategic brand profile.
Return JSON only. No markdown, no explanation.

Output exactly this structure (use these keys):
{
  "audienceProfile": {
    "primaryAudience": "one sentence",
    "secondaryAudience": "one sentence",
    "painPoints": ["string", "string", "string"],
    "motivations": ["string", "string", "string"]
  },
  "positioning": {
    "category": "market category (e.g. SaaS, DTC skincare)",
    "differentiation": "one sentence on what sets them apart",
    "marketLevel": "premium" | "mid-market" | "budget"
  },
  "brandArchetype": "single archetype (e.g. Creator, Caregiver, Ruler, Explorer, Sage, Innocent, Jester, Magician, Hero, Everyman, Lover, Outlaw)",
  "toneSpectrum": {
    "formalToCasual": 5,
    "playfulToSerious": 5,
    "modernToClassic": 5
  },
  "visualDNA": {
    "style": "one sentence visual style",
    "designDensity": "minimal" | "balanced" | "bold",
    "colorEnergy": "soft" | "vibrant" | "neutral"
  },
  "messagingAngles": ["angle 1", "angle 2", "angle 3"],
  "contentPillars": ["pillar 1", "pillar 2", "pillar 3"]
}

Rules:
- toneSpectrum values are 1-10 (1 = left end, 10 = right end).
- painPoints and motivations: 2-4 items each.
- messagingAngles: 3-5 angles. Campaign planning will use these.
- contentPillars: 3-5 pillars.
- Return only valid JSON.`;

function defaultProfile(input: DeepStrategyInput): StrategicProfile {
  const name = input.name || "Brand";
  return {
    audienceProfile: {
      primaryAudience: input.targetAudience || `Primary customers interested in ${name}.`,
      secondaryAudience: `Secondary segment adjacent to primary.`,
      painPoints: ["Need clarity", "Time constraints"],
      motivations: ["Quality", "Trust"],
    },
    positioning: {
      category: "Brand / product",
      differentiation: input.tagline || input.description?.slice(0, 80) || "Differentiated offer.",
      marketLevel: "mid-market",
    },
    brandArchetype: "Creator",
    toneSpectrum: { formalToCasual: 5, playfulToSerious: 5, modernToClassic: 6 },
    visualDNA: {
      style: input.aestheticNarrative?.slice(0, 100) || "Modern, clean, professional.",
      designDensity: "balanced",
      colorEnergy: (input.colors?.length ?? 0) > 3 ? "vibrant" : "soft",
    },
    messagingAngles: [input.tagline || name, input.description?.slice(0, 60) || "Key message"].filter(Boolean).slice(0, 4),
    contentPillars: ["Product & value", "Trust & proof", "Community & story"].slice(0, 4),
  };
}

function clamp1_10(n: unknown): number {
  if (typeof n === "number" && !Number.isNaN(n)) return Math.max(1, Math.min(10, Math.round(n)));
  return 5;
}

function parseProfile(parsed: Record<string, unknown>, input: DeepStrategyInput): StrategicProfile {
  const def = defaultProfile(input);
  const ap = parsed.audienceProfile as Record<string, unknown> | undefined;
  const pos = parsed.positioning as Record<string, unknown> | undefined;
  const ts = parsed.toneSpectrum as Record<string, unknown> | undefined;
  const vd = parsed.visualDNA as Record<string, unknown> | undefined;
  const arr = (v: unknown, max: number): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : [];
  const str = (v: unknown, maxLen: number): string =>
    typeof v === "string" ? v.slice(0, maxLen) : "";

  const marketLevel = pos?.marketLevel;
  const ml = marketLevel === "premium" || marketLevel === "mid-market" || marketLevel === "budget" ? marketLevel : "mid-market";
  const density = vd?.designDensity === "minimal" || vd?.designDensity === "balanced" || vd?.designDensity === "bold" ? vd.designDensity : "balanced";
  const energy = vd?.colorEnergy === "soft" || vd?.colorEnergy === "vibrant" || vd?.colorEnergy === "neutral" ? vd.colorEnergy : "neutral";

  return {
    audienceProfile: {
      primaryAudience: str(ap?.primaryAudience, 200) || def.audienceProfile.primaryAudience,
      secondaryAudience: str(ap?.secondaryAudience, 200) || def.audienceProfile.secondaryAudience,
      painPoints: arr(ap?.painPoints, 4).length ? arr(ap?.painPoints, 4) : def.audienceProfile.painPoints,
      motivations: arr(ap?.motivations, 4).length ? arr(ap?.motivations, 4) : def.audienceProfile.motivations,
    },
    positioning: {
      category: str(pos?.category, 80) || def.positioning.category,
      differentiation: str(pos?.differentiation, 200) || def.positioning.differentiation,
      marketLevel: ml,
    },
    brandArchetype: str(parsed.brandArchetype, 40) || def.brandArchetype,
    toneSpectrum: {
      formalToCasual: clamp1_10(ts?.formalToCasual),
      playfulToSerious: clamp1_10(ts?.playfulToSerious),
      modernToClassic: clamp1_10(ts?.modernToClassic),
    },
    visualDNA: {
      style: str(vd?.style, 150) || def.visualDNA.style,
      designDensity: density,
      colorEnergy: energy,
    },
    messagingAngles: arr(parsed.messagingAngles, 6).length ? arr(parsed.messagingAngles, 6) : def.messagingAngles,
    contentPillars: arr(parsed.contentPillars, 6).length ? arr(parsed.contentPillars, 6) : def.contentPillars,
  };
}

/**
 * Generate a structured strategic brand profile from site + brand kit.
 * Uses GPT when OPENAI_API_KEY is set; otherwise returns a sensible default.
 */
export async function analyzeDeepStrategy(input: DeepStrategyInput): Promise<StrategicProfile> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();

  const hero = input.heroSection ?? input.websiteScrapedText?.slice(0, 600) ?? "";
  const about = input.aboutSection ?? input.description ?? input.websiteScrapedText?.slice(600, 1400) ?? "";
  const product = input.productDescriptions ?? input.websiteScrapedText?.slice(1400, 2400) ?? "";
  const visualCues = input.visualCues ?? [
    input.colors?.length ? `Colors: ${input.colors.slice(0, 6).join(", ")}` : "",
    input.fonts?.length ? `Fonts: ${input.fonts.slice(0, 3).join(", ")}` : "",
    input.aestheticNarrative ? `Style note: ${input.aestheticNarrative.slice(0, 150)}` : "",
  ].filter(Boolean).join(". ");

  const userParts = [
    `Brand name: ${input.name}`,
    input.tagline ? `Tagline: ${input.tagline}` : "",
    input.description ? `Description: ${input.description.slice(0, 400)}` : "",
    input.personality ? `Personality: ${input.personality}` : "",
    input.tone ? `Tone: ${input.tone}` : "",
    input.targetAudience ? `Target audience (existing): ${input.targetAudience}` : "",
    hero ? `Hero / top of page: ${hero}` : "",
    about ? `About / company: ${about}` : "",
    product ? `Product / offering: ${product}` : "",
    visualCues ? `Visual cues: ${visualCues}` : "",
  ].filter(Boolean);

  const userContent = userParts.join("\n\n");

  if (!apiKey) {
    return defaultProfile(input);
  }

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
          { role: "user", content: userContent.slice(0, 6000) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (process.env.NODE_ENV === "development") console.warn("[DeepStrategy] OpenAI error:", res.status, err.slice(0, 200));
      return defaultProfile(input);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return defaultProfile(input);

    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return parseProfile(parsed, input);
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.warn("[DeepStrategy] GPT failed:", e);
    return defaultProfile(input);
  }
}

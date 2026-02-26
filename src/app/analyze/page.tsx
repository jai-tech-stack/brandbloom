"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, getSession } from "next-auth/react";
import { Header } from "@/components/Header";

/** Parse response as JSON; if body is HTML or invalid, return fallback to avoid ChunkLoadError-style parse errors. */
async function safeJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return { error: "Server returned an invalid response. Please try again." } as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: "Invalid response from server. Please try again." } as T;
  }
}

const EXTRACTION_STEPS = [
  "Understanding the brand",
  "Mapping visual patterns",
  "Capturing the color palette",
  "Learning the aesthetics",
  "Putting everything together",
];

/** TryBloom-style: categorized idea modules with title, description, and prompt. */
const IDEA_MODULES: { category: string; subtitle?: string; items: { title: string; description: string; prompt: string; icon: string }[] }[] = [
  {
    category: "Social Media",
    subtitle: "Share on-brand content across platforms",
    items: [
      { title: "LinkedIn Post", description: "Share professional insights and thought leadership", prompt: "Full LinkedIn post image: professional layout with space for headline and copy, business-appropriate, not a logo", icon: "💼" },
      { title: "Instagram Story", description: "Quick vertical content for stories and reels", prompt: "Full Instagram story or reel graphic: vertical 9:16, engaging visual with room for text, scroll-stopping", icon: "📱" },
      { title: "Twitter/X Post", description: "Shareable visuals for tweets and threads", prompt: "Full Twitter or X post image: shareable quote or visual graphic, concise and impactful", icon: "🐦" },
      { title: "YouTube Thumbnail", description: "Click-worthy preview images for videos", prompt: "Full YouTube thumbnail: bold imagery and text area, high contrast, click-worthy", icon: "▶️" },
      { title: "Facebook Post", description: "Engaging visuals for your Facebook audience", prompt: "Full Facebook post image: engaging visual, shareable, community-friendly", icon: "👍" },
      { title: "Pinterest Pin", description: "Discoverable pins that drive saves and clicks", prompt: "Full Pinterest pin graphic: vertical layout, inspirational or how-to style, discoverable", icon: "📌" },
    ],
  },
  {
    category: "Announcement",
    subtitle: "Launch and celebrate with impact",
    items: [
      { title: "Product Launch", description: "Introduce a new product or feature with impact", prompt: "Product launch announcement visual, premium reveal, impactful and modern", icon: "🚀" },
      { title: "Event Invite", description: "Promote events with date, details, and energy", prompt: "Event invitation or poster, date and details, energetic and inviting", icon: "📅" },
      { title: "Celebrate Achievements", description: "Highlight milestones and wins", prompt: "Celebration or achievement graphic, milestone, congratulatory and professional", icon: "🏆" },
      { title: "Attract Talent", description: "Recruitment and hiring visuals", prompt: "Recruitment or hiring poster, attract talent, company culture, professional", icon: "✨" },
    ],
  },
  {
    category: "Blog & Content",
    subtitle: "Set the scene for articles and downloads",
    items: [
      { title: "Blog Hero Image", description: "Set the scene for articles and posts", prompt: "Blog hero or header image, editorial quality, sets the tone for the article", icon: "📄" },
      { title: "Newsletter", description: "Create newsletters that engage and inform", prompt: "Newsletter header or banner, engaging and informative, on-brand", icon: "📧" },
      { title: "eBook / Guide Cover", description: "Professional covers for guides and downloads", prompt: "eBook or guide cover, professional, clear title area, download-ready", icon: "📚" },
    ],
  },
  {
    category: "Advertising",
    subtitle: "High-impact campaigns that convert",
    items: [
      { title: "Display Ad", description: "Banner ads for websites and app placements", prompt: "Display or banner ad, clear CTA, professional, conversion-focused", icon: "🎯" },
      { title: "Social Media Ad", description: "High-impact visual campaigns that convert", prompt: "Social media ad creative, high-impact, campaign-ready, conversion-focused", icon: "📢" },
    ],
  },
  {
    category: "Quote Card",
    subtitle: "Testimonials, thought leadership, and inspiration",
    items: [
      { title: "Customer Testimonial", description: "Showcase what others love about you", prompt: "Customer testimonial or quote card, authentic and trustworthy", icon: "💬" },
      { title: "Thought Leadership", description: "Share bold ideas and enhance your persona", prompt: "Thought leadership quote card, bold and authoritative, professional", icon: "💡" },
      { title: "Team Spotlight", description: "Feature team members and their roles", prompt: "Team spotlight or feature card, professional headshot style, human and approachable", icon: "👥" },
      { title: "Inspirational Quote", description: "Uplifting messages with beautiful backgrounds", prompt: "Inspirational quote card, uplifting message, beautiful typography and background", icon: "✨" },
    ],
  },
  {
    category: "Profile Banner",
    subtitle: "Headers for your social and channel profiles",
    items: [
      { title: "LinkedIn Banner", description: "Professional header for your LinkedIn profile", prompt: "LinkedIn profile banner, professional header, 1584x396, on-brand", icon: "💼" },
      { title: "Twitter/X Header", description: "Express your brand personality on Twitter/X", prompt: "Twitter or X profile header, brand personality, 1500x500", icon: "🐦" },
      { title: "YouTube Channel Art", description: "Welcome banner for your YouTube channel", prompt: "YouTube channel art banner, welcoming, 2560x1440 safe area", icon: "▶️" },
      { title: "Facebook Cover", description: "Wide cover image for your Facebook page", prompt: "Facebook page cover photo, wide format, on-brand and engaging", icon: "👍" },
    ],
  },
  {
    category: "Product Shot",
    subtitle: "Hero, lifestyle, and catalog visuals",
    items: [
      { title: "Hero Product Shot", description: "Clean, focused shot of a single product", prompt: "Hero product shot, clean studio lighting, single product focus, premium", icon: "📸" },
      { title: "Lifestyle Shot", description: "Products styled in real-world settings", prompt: "Lifestyle product shot, real-world setting, aspirational and authentic", icon: "🌿" },
      { title: "Catalog Layout", description: "Grid layout showcasing multiple products", prompt: "Catalog or grid layout, multiple products, clean and shoppable", icon: "📦" },
    ],
  },
  {
    category: "Merchandise",
    subtitle: "Apparel and branded goods",
    items: [
      { title: "Streetwear Hoodie", description: "Bold urban hoodie designs", prompt: "Streetwear hoodie design mockup, bold typography, urban style, brand placement", icon: "👕" },
      { title: "Minimalist Tee", description: "Clean, subtle t-shirt graphics", prompt: "Minimalist t-shirt design, clean and subtle, premium tee mockup", icon: "👔" },
      { title: "Tote Bag", description: "Everyday branded tote designs", prompt: "Branded tote bag design, everyday carry, clean and usable", icon: "🛍️" },
      { title: "Cap & Hat", description: "Smart trendy hat and cap graphics", prompt: "Cap or hat design mockup, trendy, brand logo or graphic", icon: "🧢" },
    ],
  },
];

const CURATED_AESTHETICS = [
  {
    id: "streetwear",
    title: "Streetwear Merch",
    prompt: "Streetwear merchandise design, urban fashion, hoodie or jacket mockup, bold typography, modern street style, brand logo placement",
  },
  {
    id: "premium",
    title: "Premium Editorial",
    prompt: "Premium editorial photography, dramatic lighting, silhouetted figure, misty atmosphere, cinematic, high-end magazine style, aspirational",
  },
  {
    id: "epic",
    title: "Epic Landscape",
    prompt: "Epic landscape photography, vast mountains, golden hour, dramatic sky, cinematic scale, professional nature photography",
  },
  {
    id: "minimal",
    title: "Minimal & Clean",
    prompt: "Minimalist design, clean composition, lots of white space, simple shapes, modern and elegant, professional",
  },
  {
    id: "vintage",
    title: "Vintage & Retro",
    prompt: "Vintage retro style, warm tones, film grain, nostalgic, classic design elements, timeless aesthetic",
  },
  {
    id: "tech",
    title: "Tech & Futuristic",
    prompt: "Futuristic tech design, neon accents, cyber aesthetic, modern technology, sleek and innovative",
  },
  {
    id: "nature",
    title: "Organic & Natural",
    prompt: "Organic natural aesthetic, earth tones, sustainable feel, botanical elements, eco-friendly vibe",
  },
  {
    id: "luxury",
    title: "Luxury & Premium",
    prompt: "Luxury premium aesthetic, gold accents, rich textures, high-end materials, sophisticated elegance",
  },
];

const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "2:3", label: "Portrait (2:3)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:5", label: "Social (4:5)" },
  { value: "9:16", label: "Mobile (9:16)" },
  { value: "3:2", label: "Landscape (3:2)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "5:4", label: "Classic (5:4)" },
  { value: "16:9", label: "Widescreen (16:9)" },
  { value: "21:9", label: "Cinematic (21:9)" },
  { value: "__auto__", label: "Auto (AI decides)" },
];

type BrandData = {
  name: string;
  description: string;
  tagline: string;
  colors: string[];
  image: string | null;
  siteUrl: string;
  domain: string;
  fonts?: string[];
  logos?: string[];
  socialAccounts?: string[];
  personality?: string;
  tone?: string;
  brandId?: string;
  /** Deep LLM Brand DNA */
  values?: string[];
  targetAudience?: string;
  visualStyleSummary?: string;
  keyMessages?: string[];
  toneKeywords?: string[];
  aestheticNarrative?: string;
  /** Strategic profile (audience, positioning, archetype, toneSpectrum, visualDNA, messagingAngles, contentPillars) */
  strategyProfile?: {
    audienceProfile?: { primaryAudience?: string; secondaryAudience?: string; painPoints?: string[]; motivations?: string[] };
    positioning?: { category?: string; differentiation?: string; marketLevel?: string };
    brandArchetype?: string;
    toneSpectrum?: { formalToCasual?: number; playfulToSerious?: number; modernToClassic?: number };
    visualDNA?: { style?: string; designDensity?: string; colorEnergy?: string };
    messagingAngles?: string[];
    contentPillars?: string[];
  } | null;
};

/** Logo or image URL that is safe to use as Image src (http/data, non-empty). */
function validBrandImageUrl(brand: BrandData | null): string | null {
  if (!brand) return null;
  const img = (brand.image && !brand.image.endsWith(".mp4")) ? brand.image : brand.logos?.[0];
  if (!img || typeof img !== "string") return null;
  const s = img.trim();
  if (!s || (!s.startsWith("http") && !s.startsWith("data:"))) return null;
  return s;
}

/** Tone chips: prefer deep-analysis toneKeywords, else derive from personality + tone. */
function toneChipsFromBrand(brand: BrandData | null): string[] {
  if (!brand) return [];
  if (brand.toneKeywords?.length) return brand.toneKeywords.slice(0, 8);
  const seen = new Set<string>();
  const add = (raw: string) => {
    raw.split(/[,;.]/)
      .flatMap((s) => s.split(/\s+and\s+/i))
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 25)
      .forEach((t) => seen.add(t));
  };
  if (brand.tone) add(brand.tone);
  if (brand.personality) add(brand.personality);
  return Array.from(seen).slice(0, 8);
}

/** Aesthetic paragraph: use deep-analysis narrative when present, else compose from fields. */
function aestheticParagraphFromBrand(brand: BrandData | null): string {
  if (!brand) return "—";
  if (brand.aestheticNarrative?.trim()) return brand.aestheticNarrative.trim();
  const parts: string[] = [];
  if (brand.description) parts.push(brand.description);
  if (brand.colors?.length) parts.push(`Palette: ${brand.colors.slice(0, 4).join(", ")}.`);
  if (brand.fonts?.length) parts.push(`Typography: ${brand.fonts.slice(0, 2).join(" and ")}.`);
  if (brand.visualStyleSummary) parts.push(brand.visualStyleSummary);
  if (brand.personality) parts.push(brand.personality);
  if (brand.tone) parts.push(brand.tone);
  return parts.join(" ") || "Brand style captured from the site.";
}

/** Brand-aware card description (TryBloom-style: "Little Chirping Bird's Sparkle & Shine Quote Card"). */
function brandAwareCardDescription(
  brand: BrandData | null,
  title: string,
  genericDescription: string
): string {
  const name = brand?.name?.trim() || "Your brand";
  return `${name}'s ${title}. ${genericDescription}`;
}

/** Full prompt for generation: brand context + idea prompt. */
function buildIdeaPrompt(brand: BrandData | null, ideaPrompt: string): string {
  const prefix = brand?.name?.trim() ? `${brand.name}: ` : "";
  return `${prefix}${ideaPrompt}`;
}

/** Normalize URL for comparison (decode and strip trailing slash). */
function normalizeUrlForCompare(u: string): string {
  try {
    const decoded = decodeURIComponent(u.trim());
    const normalized = decoded.replace(/\/+$/, "") || decoded;
    return normalized;
  } catch {
    return u;
  }
}

/** Font preview with Aa Bb Cc in that font (loads from Google Fonts). */
function FontSample({ name }: { name: string }) {
  const safeName = name.trim().replace(/\s+/g, " ");
  const fontFamily = safeName ? `"${safeName}", sans-serif` : "sans-serif";
  const familyParam = encodeURIComponent(safeName).replace(/%20/g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;
  return (
    <div>
      <link rel="stylesheet" href={href} />
      <p className="text-lg text-white" style={{ fontFamily }}>Aa Bb Cc</p>
      <p className="mt-0.5 text-xs text-stone-500">{name}</p>
    </div>
  );
}

type GeneratedAsset = {
  id: string;
  url: string;
  label: string;
  type: string;
  width: number;
  height: number;
};

type Phase = "extracting" | "generated" | "review" | "create" | "assets";

function parsePhaseFromQuery(stage: string | null): Phase {
  if (stage === "extracting" || stage === "generated" || stage === "review" || stage === "create" || stage === "assets") {
    return stage;
  }
  return "extracting";
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const url = searchParams.get("url") ?? "";
  const brandIdParam = searchParams.get("brandId");
  const promptParam = searchParams.get("prompt");
  const stage = searchParams.get("stage");
  const [phase, setPhase] = useState<Phase>(() => parsePhaseFromQuery(stage));
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(36);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [createPrompt, setCreatePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("__auto__");
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<GeneratedAsset[] | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [replicateAttempted, setReplicateAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realImagesAvailable, setRealImagesAvailable] = useState<boolean | null>(null);
  const [extractRetryKey, setExtractRetryKey] = useState(0);
  const [resizingPlatform, setResizingPlatform] = useState<string | null>(null);
  const [uploadImageUrl, setUploadImageUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedIdeaTags, setSelectedIdeaTags] = useState<string[]>([]);
  /** Idea type for pipeline (e.g. "LinkedIn Post" → linkedin_post); sent to generate-assets */
  const [selectedIdeaType, setSelectedIdeaType] = useState<string>("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [editorPrompt, setEditorPrompt] = useState("");
  const [reviewEditOpen, setReviewEditOpen] = useState(false);
  const [reviewViewTab, setReviewViewTab] = useState<"kit" | "strategy">("kit");

  const displayUrl = url ? decodeURIComponent(url) : (brandIdParam && !url ? "Logo-based brand" : "");
  const domain = brand?.domain ?? (url ? new URL(decodeURIComponent(url)).hostname.replace(/^www\./, "") : (brandIdParam ? "—" : ""));

  const goToPhase = useCallback((next: Phase) => {
    setPhase(next);
    const params = new URLSearchParams();
    if (url) params.set("url", decodeURIComponent(url));
    params.set("stage", next);
    if (brandIdParam) params.set("brandId", brandIdParam);
    if (promptParam) params.set("prompt", promptParam);
    const nextPath = `/analyze?${params.toString()}`;
    router.replace(nextPath);
  }, [url, router, brandIdParam, promptParam]);

  useEffect(() => {
    const queryPhase = parsePhaseFromQuery(stage);
    if (queryPhase !== phase) setPhase(queryPhase);
  }, [stage, phase]);

  useEffect(() => {
    if (!promptParam) return;
    try {
      setCreatePrompt(decodeURIComponent(promptParam));
    } catch {
      setCreatePrompt(promptParam);
    }
  }, [promptParam]);

  useEffect(() => {
    if (status === "unauthenticated" && (url || brandIdParam)) {
      const callback = url
        ? `/analyze?url=${encodeURIComponent(url)}`
        : brandIdParam
          ? `/analyze?brandId=${encodeURIComponent(brandIdParam)}&stage=${encodeURIComponent(stage ?? "review")}`
          : "/";
      router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
    }
  }, [status, url, brandIdParam, stage, router]);

  const PENDING_BRAND_KEY = "brandbloom-pending-brand";

  useEffect(() => {
    if (!brandIdParam || status !== "authenticated") return;
    fetch(`/api/brands/${brandIdParam}`, { credentials: "include" })
      .then(async (r) => ({ ok: r.ok, data: await safeJson(r) }))
      .then(({ ok, data }) => {
        if (!ok || !data?.brand) return;
        const loaded = data.brand as BrandData & { assets?: Array<{ id: string; url: string; label: string; type: string; width: number; height: number; prompt?: string | null }> };
        setBrand(loaded);
        const existingAssets = (loaded.assets ?? [])
          .filter((a) => typeof a.url === "string" && a.url.startsWith("http"))
          .map((a) => ({
            id: a.id,
            url: a.url,
            label: a.label,
            type: a.type,
            width: a.width,
            height: a.height,
          }));
        if (existingAssets.length) {
          setAssets(existingAssets);
          setSelectedAssetId(existingAssets[0].id);
          setEditorPrompt(loaded.assets?.[0]?.prompt ?? "");
          goToPhase(parsePhaseFromQuery(stage) === "assets" ? "assets" : parsePhaseFromQuery(stage) === "review" ? "review" : "create");
        } else {
          goToPhase(parsePhaseFromQuery(stage) === "review" ? "review" : "create");
        }
      })
      .catch(() => {
        // ignore preload failure; extraction flow can still work
      });
  }, [brandIdParam, status, stage, goToPhase]);

  useEffect(() => {
    if (!url || status !== "authenticated" || !!brandIdParam) return;
    try {
      const stored = typeof window !== "undefined" ? sessionStorage.getItem(PENDING_BRAND_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored) as { url?: string; brand?: BrandData };
        const sameUrl = parsed.url && url && normalizeUrlForCompare(parsed.url) === normalizeUrlForCompare(url);
        if (sameUrl && parsed.brand) {
          setBrand(parsed.brand);
          setExtractError(null);
          setStepIndex(EXTRACTION_STEPS.length);
          setSecondsLeft(0);
          goToPhase("create");
          sessionStorage.removeItem(PENDING_BRAND_KEY);
          return;
        }
      }
    } catch {
      // ignore
    }
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);
    const decodedUrl = decodeURIComponent(url);
    (async () => {
      try {
        const res = await fetch("/api/extract-brand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: decodedUrl }),
          credentials: "include",
          signal: controller.signal,
        });
        let data: Record<string, unknown> & { error?: string };
        try {
          data = (await res.json()) as Record<string, unknown> & { error?: string };
        } catch {
          data = { error: "Invalid response" };
        }
        if (cancelled) return;
        clearTimeout(timeoutId);
        if (res.status === 401) {
          router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${encodeURIComponent(url)}`)}`);
          return;
        }
        if (res.ok) {
          setBrand(data as BrandData);
          setExtractError(null);
          setStepIndex(EXTRACTION_STEPS.length);
          setSecondsLeft(0);
          setTimeout(() => goToPhase("review"), 600);
        } else {
          setExtractError(data.error ?? "Could not analyze URL");
          setStepIndex(EXTRACTION_STEPS.length);
          goToPhase("generated");
        }
      } catch (e) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        const isAbort = (e as Error).name === "AbortError";
        setStepIndex(EXTRACTION_STEPS.length);
        setSecondsLeft(0);
        setBrand(null);
        setExtractError(isAbort ? "Extraction timed out. Please try again." : "Could not analyze URL.");
        goToPhase("generated");
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [url, status, extractRetryKey, router, goToPhase, brandIdParam]);

  useEffect(() => {
    if (phase !== "create") return;
    fetch("/api/features", { credentials: "include" })
      .then(async (r) => safeJson<{ realImagesAvailable?: boolean }>(r))
      .then((data) => setRealImagesAvailable(!!data.realImagesAvailable))
      .catch(() => setRealImagesAvailable(false));
  }, [phase]);

  useEffect(() => {
    if (phase !== "extracting" || !url) return;
    const stepInterval = setInterval(() => {
      setStepIndex((i) => (i < EXTRACTION_STEPS.length ? i + 1 : i));
    }, 7000);
    const timerInterval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      clearInterval(stepInterval);
      clearInterval(timerInterval);
    };
  }, [phase, url]);

  function saveBrandBeforeLoginRedirect() {
    try {
      if (url && brand) {
        sessionStorage.setItem(PENDING_BRAND_KEY, JSON.stringify({ url, brand }));
      }
    } catch {
      // ignore
    }
  }

  async function fetchWithAuthRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const first = await fetch(input, { credentials: "include", ...init });
    if (first.status !== 401) return first;
    await getSession();
    return fetch(input, { credentials: "include", ...init });
  }

  async function handleCreate(promptText: string) {
    if (!url || !brand) return;
    const prompt = promptText.trim() || "Professional branded image";
    setError(null);
    setGenerating(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetchWithAuthRetry("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: decodeURIComponent(url),
          brand: {
            name: brand.name,
            colors: brand.colors,
            description: brand.description,
            tagline: brand.tagline,
            fonts: brand.fonts,
            logos: brand.logos,
            socialAccounts: brand.socialAccounts,
            personality: brand.personality,
            tone: brand.tone,
            visualStyleSummary: brand.visualStyleSummary,
            aestheticNarrative: brand.aestheticNarrative,
          },
          brandId: brand.brandId ?? undefined,
          ideaType: selectedIdeaType || undefined,
          limit: 1,
          promptOverride: prompt,
          aspectRatio: aspectRatio === "__auto__" ? "1:1" : aspectRatio,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await safeJson<{ assets?: GeneratedAsset[]; error?: string; credits?: number; demo?: boolean; replicateAttempted?: boolean }>(res);
      if (res.status === 401) {
        saveBrandBeforeLoginRedirect();
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${encodeURIComponent(url)}`)}`);
        return;
      }
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Generation failed");
      setAssets((data.assets ?? []) as GeneratedAsset[]);
      const firstAsset = data.assets?.[0] as GeneratedAsset | undefined;
      if (firstAsset?.id) setSelectedAssetId(firstAsset.id);
      setEditorPrompt(prompt);
      setDemoMode(!!data.demo);
      setReplicateAttempted(!!(data as { replicateAttempted?: boolean }).replicateAttempted);
      goToPhase("assets");
      if (typeof data.credits === "number") {
        window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setError("Generation timed out. Try again.");
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleUploadAsset() {
    const imageUrl = uploadImageUrl.trim();
    if (!imageUrl || !brand) return;
    setUploadLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuthRetry("/api/upload-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          brand: {
            name: brand.name,
            colors: brand.colors,
            description: brand.description,
          },
        }),
      });
      const data = await safeJson<{ url?: string; label?: string; error?: string; credits?: number }>(res);
      if (res.status === 401) {
        saveBrandBeforeLoginRedirect();
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${encodeURIComponent(url)}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (typeof data.credits === "number") {
        window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
      }
      if (data.url) {
        const uploadedAsset = {
          id: "1",
          url: data.url,
          label: data.label || "Uploaded (branded)",
          type: "social",
          width: 1024,
          height: 1024,
        };
        setAssets([uploadedAsset]);
        setSelectedAssetId(uploadedAsset.id);
        setEditorPrompt("Uploaded image branded variation");
        goToPhase("assets");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  }

  const RESIZE_PLATFORMS = [
    { label: "Instagram Story", aspectRatio: "9:16" },
    { label: "Instagram Post", aspectRatio: "1:1" },
    { label: "Facebook", aspectRatio: "1.91:1" },
    { label: "Pinterest", aspectRatio: "2:3" },
    { label: "YouTube Thumbnail", aspectRatio: "16:9" },
  ];

  async function handleResizeForPlatform(platformAspect: string, platformLabel: string) {
    if (!url || !brand) return;
    setResizingPlatform(platformLabel);
    setError(null);
    try {
      const res = await fetchWithAuthRetry("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: decodeURIComponent(url),
          brand: {
            name: brand.name,
            colors: brand.colors,
            description: brand.description,
            tagline: brand.tagline,
            fonts: brand.fonts,
            logos: brand.logos,
            socialAccounts: brand.socialAccounts,
            personality: brand.personality,
            tone: brand.tone,
            visualStyleSummary: brand.visualStyleSummary,
            aestheticNarrative: brand.aestheticNarrative,
          },
          brandId: brand.brandId ?? undefined,
          ideaType: selectedIdeaType || undefined,
          limit: 1,
          promptOverride: createPrompt.trim() || "Professional branded image",
          aspectRatio: platformAspect,
        }),
      });
      const data = await safeJson<{ assets?: GeneratedAsset[]; error?: string; credits?: number }>(res);
      if (res.status === 401) {
        saveBrandBeforeLoginRedirect();
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${encodeURIComponent(url)}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Resize failed");
      if (data.assets?.length) {
        const newAsset: GeneratedAsset = { ...data.assets[0], id: String((assets ?? []).length + 1), label: platformLabel };
        setAssets((prev) => [...(prev ?? []), newAsset]);
        setSelectedAssetId(newAsset.id);
      }
      if (typeof data.credits === "number") {
        window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resize failed");
    } finally {
      setResizingPlatform(null);
    }
  }

  async function handleCreateVariation() {
    if (!url || !brand) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetchWithAuthRetry("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: decodeURIComponent(url),
          brand: {
            name: brand.name,
            colors: brand.colors,
            description: brand.description,
            tagline: brand.tagline,
            fonts: brand.fonts,
            logos: brand.logos,
            socialAccounts: brand.socialAccounts,
            personality: brand.personality,
            tone: brand.tone,
            visualStyleSummary: brand.visualStyleSummary,
            aestheticNarrative: brand.aestheticNarrative,
          },
          brandId: brand.brandId ?? undefined,
          ideaType: selectedIdeaType || undefined,
          limit: 1,
          promptOverride: (createPrompt.trim() || "Professional branded image") + ", slight variation, same brand style and colors",
          aspectRatio: "1:1",
        }),
      });
      const data = await safeJson<{ assets?: GeneratedAsset[]; error?: string; credits?: number }>(res);
      if (res.status === 401) {
        saveBrandBeforeLoginRedirect();
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${encodeURIComponent(url)}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Variation failed");
      if (data.assets?.length) {
        const newAsset: GeneratedAsset = { ...data.assets[0], id: String((assets ?? []).length + 1), label: "Variation" };
        setAssets((prev) => [...(prev ?? []), newAsset]);
        setSelectedAssetId(newAsset.id);
      }
      if (typeof data.credits === "number") {
        window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Variation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (status === "loading" || (status === "unauthenticated" && url)) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!url && !brandIdParam) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-24 pb-24 text-center">
        <h1 className="mb-4 text-2xl font-bold text-white">No URL provided</h1>
        <Link href="/" className="inline-block rounded-xl bg-brand-500 px-6 py-3 font-medium text-white hover:bg-brand-400">
          Back to home
        </Link>
      </div>
    );
  }

  if (phase === "extracting") {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-6xl px-4 pt-24 pb-24 lg:flex lg:gap-12">
          <div className="mb-10 lg:mb-0 lg:w-80 lg:shrink-0">
            <h1 className="mb-1 text-2xl font-bold text-white">Extracting brand identity</h1>
            <p className="mb-8 text-sm text-stone-400">This is a one-time setup for your brand.</p>
            <ul className="space-y-4">
              {EXTRACTION_STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-3">
                  {i < stepIndex ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-sm text-white">✓</span>
                  ) : i === stepIndex ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  ) : (
                    <span className="h-5 w-5 rounded-full border-2 border-surface-500" />
                  )}
                  <span className={i <= stepIndex ? "text-white" : "text-stone-500"}>{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-stone-500">About {secondsLeft} seconds remaining.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {brand && (
              <>
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <div className="flex items-center gap-3">
                    {brand.image && !brand.image.endsWith(".mp4") ? (
                      <Image src={brand.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/30 text-lg font-bold text-brand-400">{brand.name.slice(0, 1)}</div>
                    )}
                    <span className="font-semibold text-white">{brand.name}</span>
                  </div>
                </div>
                {brand.tagline && (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Tagline</p>
                    <p className="mt-1 text-sm text-stone-300">&quot;{brand.tagline}&quot;</p>
                  </div>
                )}
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Description</p>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-400">{brand.description || "—"}</p>
                </div>
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Website</p>
                  <p className="mt-1 text-sm text-stone-300">{brand.domain}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (phase === "generated") {
    const extractionFailed = !brand || !!extractError;
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-4xl px-4 pt-24 pb-24 text-center">
          {extractionFailed ? (
            <>
              <h1 className="mb-2 text-3xl font-bold text-white">Extraction did not complete</h1>
              <p className="mb-6 text-stone-400">We need full brand data before you can create assets. No placeholder or partial data is used.</p>
              {extractError && <p className="mb-8 text-sm text-amber-400">{extractError}</p>}
              <button
                type="button"
                onClick={() => {
                  goToPhase("extracting");
                  setExtractError(null);
                  setStepIndex(0);
                  setSecondsLeft(36);
                  setExtractRetryKey((k) => k + 1);
                }}
                className="rounded-xl bg-brand-500 px-8 py-4 text-lg font-semibold text-white hover:bg-brand-400"
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-3xl font-bold text-white">Brand identity generated</h1>
              <p className="mb-10 text-stone-400">Begin creating branded images now!</p>
              <div className="mb-10 flex justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-brand-500/50 bg-brand-500/20">
                  <span className="text-5xl font-bold text-brand-400">✓</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => goToPhase("create")}
                className="rounded-xl bg-brand-500 px-8 py-4 text-lg font-semibold text-white hover:bg-brand-400"
              >
                Let&apos;s Begin
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  if (phase === "review") {
    if (!brand) {
      return (
        <main className="min-h-screen">
          <Header />
          <div className="mx-auto max-w-4xl px-4 pt-24 pb-24 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">Brand review unavailable</h1>
            <p className="mb-6 text-stone-400">Please re-run extraction first.</p>
            <button
              type="button"
              onClick={() => {
                setExtractError(null);
                setStepIndex(0);
                setSecondsLeft(36);
                setExtractRetryKey((k) => k + 1);
                goToPhase("extracting");
              }}
              className="rounded-xl bg-brand-500 px-8 py-4 text-lg font-semibold text-white hover:bg-brand-400"
            >
              Re-extract brand
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-5xl px-4 pt-24 pb-24">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Your brand kit</h1>
              <p className="mt-1 text-sm text-stone-400">We’ve captured your brand identity. Review below, then start creating assets.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setReviewEditOpen((v) => !v)}
                className="rounded-xl border border-surface-500 px-4 py-2.5 text-sm font-medium text-stone-300 hover:border-surface-400 hover:text-white"
              >
                {reviewEditOpen ? "Done editing" : "Edit details"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExtractError(null);
                  setStepIndex(0);
                  setSecondsLeft(36);
                  setExtractRetryKey((k) => k + 1);
                  goToPhase("extracting");
                }}
                className="rounded-xl border border-surface-500 px-4 py-2.5 text-sm font-medium text-stone-400 hover:border-surface-400"
              >
                Re-extract
              </button>
              <button
                type="button"
                onClick={() => goToPhase("create")}
                className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
              >
                Continue to Create
              </button>
            </div>
          </div>

          {reviewEditOpen ? (
            <div className="mb-10 rounded-2xl border border-surface-600 bg-surface-800/50 p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">Edit brand details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500">Brand name</label>
                  <input
                    type="text"
                    value={brand.name}
                    onChange={(e) => setBrand((b) => (b ? { ...b, name: e.target.value } : b))}
                    className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500">Tagline</label>
                  <input
                    type="text"
                    value={brand.tagline ?? ""}
                    onChange={(e) => setBrand((b) => (b ? { ...b, tagline: e.target.value } : b))}
                    className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500">Description</label>
                  <textarea
                    value={brand.description ?? ""}
                    onChange={(e) => setBrand((b) => (b ? { ...b, description: e.target.value } : b))}
                    rows={3}
                    className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500">Colors (hex, comma-separated)</label>
                  <input
                    type="text"
                    value={(brand.colors ?? []).join(", ")}
                    onChange={(e) => {
                      const colors = e.target.value.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 8);
                      setBrand((b) => (b ? { ...b, colors } : b));
                    }}
                    placeholder="#hex1, #hex2"
                    className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none placeholder:text-stone-500"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="mb-6 flex gap-2 border-b border-surface-600">
            <button
              type="button"
              onClick={() => setReviewViewTab("kit")}
              className={`pb-3 text-sm font-medium transition ${reviewViewTab === "kit" ? "border-b-2 border-brand-500 text-white" : "text-stone-400 hover:text-white"}`}
            >
              Brand Kit
            </button>
            <button
              type="button"
              onClick={() => setReviewViewTab("strategy")}
              className={`pb-3 text-sm font-medium transition ${reviewViewTab === "strategy" ? "border-b-2 border-brand-500 text-white" : "text-stone-400 hover:text-white"}`}
            >
              Brand Strategy Intelligence
            </button>
          </div>

          {reviewViewTab === "strategy" && brand.strategyProfile ? (
            <div className="space-y-8">
              <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Audience</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {brand.strategyProfile.audienceProfile?.primaryAudience && (
                    <div>
                      <p className="text-xs text-stone-500">Primary</p>
                      <p className="mt-1 text-sm text-stone-300">{brand.strategyProfile.audienceProfile.primaryAudience}</p>
                    </div>
                  )}
                  {brand.strategyProfile.audienceProfile?.secondaryAudience && (
                    <div>
                      <p className="text-xs text-stone-500">Secondary</p>
                      <p className="mt-1 text-sm text-stone-300">{brand.strategyProfile.audienceProfile.secondaryAudience}</p>
                    </div>
                  )}
                </div>
                {(brand.strategyProfile.audienceProfile?.painPoints?.length || brand.strategyProfile.audienceProfile?.motivations?.length) ? (
                  <div className="mt-4 flex flex-wrap gap-4">
                    {brand.strategyProfile.audienceProfile.painPoints?.length ? (
                      <div>
                        <p className="text-xs text-stone-500">Pain points</p>
                        <ul className="mt-1 list-inside list-disc text-sm text-stone-400">
                          {brand.strategyProfile.audienceProfile.painPoints.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {brand.strategyProfile.audienceProfile.motivations?.length ? (
                      <div>
                        <p className="text-xs text-stone-500">Motivations</p>
                        <ul className="mt-1 list-inside list-disc text-sm text-stone-400">
                          {brand.strategyProfile.audienceProfile.motivations.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
              <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Positioning</h2>
                <div className="space-y-2">
                  {brand.strategyProfile.positioning?.category && (
                    <p className="text-sm text-stone-300"><span className="text-stone-500">Category:</span> {brand.strategyProfile.positioning.category}</p>
                  )}
                  {brand.strategyProfile.positioning?.differentiation && (
                    <p className="text-sm text-stone-300"><span className="text-stone-500">Differentiation:</span> {brand.strategyProfile.positioning.differentiation}</p>
                  )}
                  {brand.strategyProfile.positioning?.marketLevel && (
                    <p className="text-sm text-stone-300"><span className="text-stone-500">Market:</span> {brand.strategyProfile.positioning.marketLevel}</p>
                  )}
                </div>
              </section>
              {brand.strategyProfile.brandArchetype ? (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Brand archetype</h2>
                  <p className="text-sm font-medium text-white">{brand.strategyProfile.brandArchetype}</p>
                </section>
              ) : null}
              {brand.strategyProfile.toneSpectrum ? (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Tone spectrum</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-stone-500">
                        <span>Formal</span>
                        <span>Casual</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-700">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${((brand.strategyProfile.toneSpectrum.formalToCasual ?? 5) / 10) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-stone-500">
                        <span>Playful</span>
                        <span>Serious</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-700">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${((brand.strategyProfile.toneSpectrum.playfulToSerious ?? 5) / 10) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-stone-500">
                        <span>Modern</span>
                        <span>Classic</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-700">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${((brand.strategyProfile.toneSpectrum.modernToClassic ?? 5) / 10) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
              {brand.strategyProfile.messagingAngles?.length ? (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Messaging angles</h2>
                  <ul className="list-inside list-disc space-y-1 text-sm text-stone-300">
                    {brand.strategyProfile.messagingAngles.map((angle, i) => (
                      <li key={i}>{angle}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {brand.strategyProfile.contentPillars?.length ? (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Content pillars</h2>
                  <div className="flex flex-wrap gap-2">
                    {brand.strategyProfile.contentPillars.map((pillar, i) => (
                      <span key={i} className="rounded-full bg-surface-600 px-3 py-1 text-sm text-stone-300">{pillar}</span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : reviewViewTab === "strategy" && !brand.strategyProfile ? (
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-8 text-center">
              <p className="text-stone-400">Strategy profile not available for this brand. Re-extract the brand to generate strategic intelligence.</p>
            </div>
          ) : null}

          {reviewViewTab === "kit" ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Identity</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-xl border border-surface-600 bg-surface-800/50 p-5">
                  {validBrandImageUrl(brand) ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={validBrandImageUrl(brand)!}
                        alt=""
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-2xl font-bold text-brand-400">
                      {brand.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{brand.name}</p>
                    {brand.tagline ? <p className="mt-0.5 text-sm text-stone-400">&quot;{brand.tagline}&quot;</p> : null}
                  </div>
                </div>
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Website</p>
                  <p className="mt-1.5 text-sm text-stone-300 break-all">{domain}</p>
                </div>
                {brand.description ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Description</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-400">{brand.description}</p>
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Design language</h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Colors</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {brand.colors?.length ? brand.colors.map((c) => (
                      <span key={c} className="h-10 w-10 rounded-lg border border-surface-500 shadow-inner" style={{ backgroundColor: c }} title={c} />
                    )) : <span className="text-sm text-stone-500">—</span>}
                  </div>
                </div>
                {brand.fonts?.length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Fonts</p>
                    <div className="mt-3 flex flex-wrap gap-4">
                      {brand.fonts.slice(0, 3).map((fontName) => (
                        <FontSample key={fontName} name={fontName} />
                      ))}
                    </div>
                  </div>
                ) : null}
                {toneChipsFromBrand(brand).length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Tone</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {toneChipsFromBrand(brand).map((chip) => (
                        <span key={chip} className="rounded-full bg-surface-600 px-2.5 py-0.5 text-xs text-stone-300">{chip}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {(brand.values?.length || brand.targetAudience || brand.visualStyleSummary) ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Aesthetic</p>
                    <p className="mt-2 text-sm leading-relaxed text-stone-400">{aestheticParagraphFromBrand(brand)}</p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
          ) : null}
        </div>
      </main>
    );
  }

  if (phase === "create") {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto flex max-w-6xl gap-8 px-4 pt-24 pb-24">
          <aside className="hidden w-80 shrink-0 space-y-8 lg:block">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Your brand kit</h2>
              <p className="mt-0.5 text-xs text-stone-500">Review below, then create assets.</p>
              <button
                type="button"
                onClick={() => {
                  setBrand(null);
                  setExtractError(null);
                  goToPhase("extracting");
                  setStepIndex(0);
                  setSecondsLeft(36);
                  setExtractRetryKey((k) => k + 1);
                }}
                className="mt-2 text-xs text-brand-400 hover:text-brand-300"
              >
                Re-analyze brand from URL
              </button>
            </div>

            {/* Identity — TryBloom-style */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Identity</h3>
              <div className="mt-3 space-y-4">
                {/* Logo prominent */}
                {validBrandImageUrl(brand) ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <div className="relative h-14 w-full">
                      <Image
                        src={validBrandImageUrl(brand)!}
                        alt=""
                        fill
                        unoptimized
                        className="object-contain object-left"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500/30 text-lg font-bold text-brand-400">{brand?.name?.slice(0, 1) ?? "?"}</div>
                    <span className="font-semibold text-white">{brand?.name ?? "Brand"}</span>
                  </div>
                )}
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Website</p>
                  <p className="mt-1 text-sm text-stone-300 break-all">{domain}</p>
                </div>
                {brand?.description ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Description</p>
                    <p className="mt-1 text-sm text-stone-400">{brand.description}</p>
                  </div>
                ) : null}
                {brand?.tagline ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Tagline</p>
                    <p className="mt-1 text-sm text-stone-300">&quot;{brand.tagline}&quot;</p>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Design Language — TryBloom-style */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Design Language</h3>
              <div className="mt-3 space-y-4">
                {/* Colors — larger swatches */}
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Colors</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {brand?.colors?.length ? (
                      brand.colors.map((c) => (
                        <span
                          key={c}
                          className="h-9 w-9 rounded-lg border border-surface-500 shadow-inner"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))
                    ) : (
                      <span className="text-sm text-stone-500">—</span>
                    )}
                  </div>
                </div>
                {/* Fonts — with Aa Bb Cc preview */}
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Fonts</p>
                  {brand?.fonts?.length ? (
                    <div className="mt-3 space-y-3">
                      {brand.fonts.slice(0, 4).map((fontName) => (
                        <FontSample key={fontName} name={fontName} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">None detected from this site</p>
                  )}
                </div>
                {/* Tone — chips (from deep analysis or personality/tone) */}
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Tone</p>
                  {toneChipsFromBrand(brand).length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {toneChipsFromBrand(brand).map((chip) => (
                        <span key={chip} className="rounded-full bg-surface-600 px-2.5 py-0.5 text-xs text-stone-300">{chip}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-stone-500">Default style</p>
                  )}
                </div>
                {brand?.values?.length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Values</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {brand.values.map((v) => (
                        <span key={v} className="rounded-full bg-brand-500/20 px-2.5 py-0.5 text-xs text-brand-200">{v}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {brand?.targetAudience ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Target audience</p>
                    <p className="mt-2 text-sm leading-relaxed text-stone-400">{brand.targetAudience}</p>
                  </div>
                ) : null}
                {brand?.keyMessages?.length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Key messages</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-400">
                      {brand.keyMessages.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {/* Aesthetic — deep narrative or composed paragraph */}
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Aesthetic</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-400">
                    {aestheticParagraphFromBrand(brand)}
                  </p>
                </div>
                {brand?.socialAccounts?.length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Social</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {brand.socialAccounts.slice(0, 5).map((u) => {
                        try {
                          return new URL(u).hostname.replace(/^www\./, "");
                        } catch {
                          return u;
                        }
                      }).join(", ")}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
          <div className="min-w-0 flex-1">
            <h2 className="mb-6 text-2xl font-bold text-white">What will you create?</h2>
            {realImagesAvailable === false && (
              <p className="mb-4 text-sm text-stone-500">Add <Link href="/setup" className="text-brand-400 hover:text-brand-300 underline">REPLICATE_API_TOKEN</Link> in .env for real AI images; otherwise placeholders are shown.</p>
            )}
            {realImagesAvailable === true && (
              <p className="mb-4 text-sm text-green-400/90">Real AI images enabled.</p>
            )}
            {selectedIdeaTags.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {selectedIdeaTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-xs text-brand-200">
                    {tag}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedIdeaTags([])}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Clear
                </button>
              </div>
            )}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                type="text"
                value={createPrompt}
                onChange={(e) => setCreatePrompt(e.target.value)}
                placeholder="Poster, merch design, anything..."
                className="flex-1 rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <div className="flex items-center gap-2">
                <label htmlFor="aspect-ratio" className="text-sm text-stone-500">Aspect</label>
                <select
                  id="aspect-ratio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="rounded-xl border border-surface-600 bg-surface-800 px-3 py-2.5 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleCreate(createPrompt)}
                disabled={generating}
                className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-400 disabled:opacity-60"
              >
                {generating ? "Creating…" : "Create"}
              </button>
            </div>
            <div className="mb-6 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
            <p className="mb-2 text-sm font-medium text-white">Upload image</p>
            <p className="mb-3 text-xs text-stone-500">Paste a public image URL to turn it into a branded asset.</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="url"
                value={uploadImageUrl}
                onChange={(e) => setUploadImageUrl(e.target.value)}
                placeholder="https://example.com/your-image.jpg"
                className="flex-1 min-w-[200px] rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={uploadLoading}
                onClick={handleUploadAsset}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-60"
              >
                {uploadLoading ? "Processing…" : "Turn into branded asset"}
              </button>
            </div>
          </div>
            <section className="mb-8">
              <h3 className="mb-1 text-lg font-semibold text-white">Ideas</h3>
              <p className="mb-6 text-sm text-stone-500">Browse concepts. Click a card to load a brand-aware prompt into the box above—edit it if you like, then click Create to generate that asset type (post, story, banner, etc.).</p>
              {IDEA_MODULES.map((section) => (
                <div key={section.category} className="mb-8">
                  <h4 className="mb-1 text-sm font-medium uppercase tracking-wider text-stone-400">{section.category}</h4>
                  {section.subtitle && <p className="mb-3 text-xs text-stone-500">{section.subtitle}</p>}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((item) => {
                      const promptText = buildIdeaPrompt(brand, item.prompt);
                      const cardDescription = brandAwareCardDescription(brand, item.title, item.description);
                      return (
                        <button
                          key={`${section.category}-${item.title}`}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedIdeaTags((prev) => Array.from(new Set([...prev, item.title])).slice(0, 4));
                            setSelectedIdeaType(item.title);
                            setCreatePrompt(promptText);
                            setError(null);
                          }}
                          className="rounded-xl border border-surface-600 bg-surface-800/50 p-4 text-left transition hover:border-brand-500/50 hover:bg-surface-700/50"
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <p className="mt-2 font-medium text-white">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">{cardDescription}</p>
                          <span className="mt-3 inline-block rounded-lg bg-brand-500/20 px-3 py-1.5 text-xs font-medium text-brand-300">
                            Use this idea
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <div className="mb-6 rounded-xl border border-surface-600 bg-surface-800/30 p-4">
              <p className="mb-1 text-sm font-medium text-stone-300">Curated Aesthetics</p>
              <p className="mb-4 text-xs text-stone-500">Style presets: generate in streetwear, minimal, luxury, and more.</p>
              <div className="flex flex-wrap gap-2">
                {CURATED_AESTHETICS.map((a) => {
                  const promptText = `${brand?.name ?? "Brand"}: ${a.prompt}`;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedIdeaTags((prev) => Array.from(new Set([...prev, a.title])).slice(0, 4));
                        setSelectedIdeaType(""); // Curated aesthetic = custom
                        setCreatePrompt(promptText);
                        setError(null);
                      }}
                      className="rounded-lg border border-surface-500 bg-surface-700/50 px-3 py-2 text-sm text-stone-200 transition hover:border-brand-500/50 hover:bg-surface-600/50"
                    >
                      {a.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}
            <div className="mt-8">
              <Link href="/" className="text-sm text-stone-400 hover:text-white">Try another URL</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "assets" && (!assets || assets.length === 0)) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-xl px-4 pt-32 pb-24 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">No images generated</h1>
          <p className="mb-6 text-stone-400">Generation failed or returned no assets. Check your Replicate token and credits, then try again.</p>
          <button
            type="button"
            onClick={() => goToPhase("create")}
            className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-400"
          >
            Back to Create
          </button>
        </div>
      </main>
    );
  }

  if (phase === "assets" && assets && assets.length > 0) {
    function downloadAsset(asset: GeneratedAsset, format: string = "png") {
      const link = document.createElement("a");
      link.href = asset.url;
      link.download = `${brand?.name?.replace(/\s+/g, "-").toLowerCase() || "brand"}-${asset.label.replace(/\s+/g, "-").toLowerCase()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function downloadAllAssets() {
      (assets ?? []).forEach((asset, index) => {
        setTimeout(() => downloadAsset(asset), index * 500);
      });
    }

    const selectedAsset = (assets ?? []).find((a) => a.id === selectedAssetId) ?? (assets ?? [])[0];

    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-5xl px-4 pt-24 pb-24">
          {demoMode && (
            <div className="mb-6 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <p className="font-medium text-amber-100">You’re seeing placeholder images.</p>
              {replicateAttempted ? (
                <p className="mt-1 text-amber-200/90">Replicate was called but didn’t return an image. Set up <strong>billing</strong> at <a href="https://replicate.com/account/billing" target="_blank" rel="noreferrer" className="underline">replicate.com/account/billing</a> and <strong>REPLICATE_API_TOKEN</strong> at <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="underline">replicate.com/account/api-tokens</a>. <Link href="/setup#images" className="underline hover:text-amber-100">Image setup &amp; billing →</Link></p>
              ) : (
                <p className="mt-1 text-amber-200/90">Put <strong>REPLICATE_API_TOKEN</strong> in the <strong>root</strong> <code className="rounded bg-amber-500/20 px-1">.env</code> (same folder as <code className="rounded bg-amber-500/20 px-1">package.json</code>), not in <code className="rounded bg-amber-500/20 px-1">backend/.env</code>. Then stop the dev server (Ctrl+C) and run <code className="rounded bg-amber-500/20 px-1">npm run dev</code> again. <Link href="/setup" className="underline hover:text-amber-100">Setup guide →</Link></p>
              )}
            </div>
          )}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Generated assets</h1>
              <p className="text-stone-400">{brand?.name || displayUrl}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={downloadAllAssets}
                className="rounded-xl bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-400 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download All
              </button>
              <button
                type="button"
                onClick={() => goToPhase("create")}
                className="rounded-xl border border-surface-500 px-5 py-2.5 font-medium text-white hover:border-surface-400"
              >
                Create more
              </button>
            </div>
          </div>
          <div className="mb-6 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
            <p className="mb-2 text-sm font-medium text-white">Resize for platforms</p>
            <p className="mb-3 text-xs text-stone-500">Generate the same concept in other aspect ratios.</p>
            <div className="flex flex-wrap gap-2">
              {RESIZE_PLATFORMS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={!!resizingPlatform}
                  onClick={() => handleResizeForPlatform(p.aspectRatio, p.label)}
                  className="rounded-lg border border-surface-500 bg-surface-700/50 px-3 py-2 text-sm text-stone-200 hover:border-brand-500/50 hover:bg-surface-600/50 disabled:opacity-60"
                >
                  {resizingPlatform === p.label ? "…" : p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
            <p className="mb-2 text-sm font-medium text-white">Edit / variation</p>
            <p className="mb-3 text-xs text-stone-500">Create a slight variation in the same brand style.</p>
            <button
              type="button"
              disabled={generating}
              onClick={handleCreateVariation}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-60"
            >
              {generating ? "Creating…" : "Create variation"}
            </button>
          </div>
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          )}
          <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
              <p className="mb-3 text-sm font-medium text-white">Asset editor</p>
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-700">
                <Image src={selectedAsset.url} alt={selectedAsset.label} fill unoptimized className="object-cover" />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadAsset(selectedAsset, "png")}
                  className="rounded-lg bg-surface-600 px-3 py-2 text-xs font-medium text-white hover:bg-surface-500"
                >
                  Export PNG
                </button>
                <button
                  type="button"
                  onClick={() => downloadAsset(selectedAsset, "jpg")}
                  className="rounded-lg bg-surface-600 px-3 py-2 text-xs font-medium text-white hover:bg-surface-500"
                >
                  Export JPG
                </button>
                <button
                  type="button"
                  onClick={() => downloadAsset(selectedAsset, "webp")}
                  className="rounded-lg bg-surface-600 px-3 py-2 text-xs font-medium text-white hover:bg-surface-500"
                >
                  Export WebP
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
              <p className="mb-2 text-sm font-medium text-white">Prompt tweak & regenerate</p>
              <textarea
                value={editorPrompt}
                onChange={(e) => setEditorPrompt(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                placeholder="Refine this asset prompt..."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleCreate(editorPrompt || createPrompt)}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-60"
                >
                  {generating ? "Regenerating…" : "Regenerate"}
                </button>
                <button
                  type="button"
                  disabled={generating}
                  onClick={handleCreateVariation}
                  className="rounded-lg border border-surface-500 px-4 py-2 text-sm font-medium text-white hover:border-surface-400 disabled:opacity-60"
                >
                  Variation
                </button>
              </div>
              <p className="mt-3 text-xs text-stone-500">Selected: {selectedAsset.label} ({selectedAsset.width}×{selectedAsset.height})</p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className={`group overflow-hidden rounded-xl border bg-surface-800/50 transition ${selectedAsset.id === asset.id ? "border-brand-500/70" : "border-surface-600 hover:border-brand-500/50"}`}
                onClick={() => {
                  setSelectedAssetId(asset.id);
                  setEditorPrompt(createPrompt);
                }}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-surface-700">
                  <Image src={asset.url} alt={asset.label} fill unoptimized className="object-cover transition group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-white/20 backdrop-blur px-4 py-2 text-sm font-medium text-white hover:bg-white/30"
                    >
                      View Full Size
                    </a>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-medium text-white">{asset.label}</p>
                  <p className="text-xs text-stone-500 mb-3">{asset.width}×{asset.height}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadAsset(asset, "png")}
                      className="flex-1 rounded-lg bg-surface-600 py-2 text-xs font-medium text-white hover:bg-surface-500"
                    >
                      PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAsset(asset, "jpg")}
                      className="flex-1 rounded-lg bg-surface-600 py-2 text-xs font-medium text-white hover:bg-surface-500"
                    >
                      JPG
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAsset(asset, "webp")}
                      className="flex-1 rounded-lg bg-surface-600 py-2 text-xs font-medium text-white hover:bg-surface-500"
                    >
                      WebP
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/dashboard" className="text-sm text-brand-400 hover:text-brand-300">
              View all assets in Dashboard →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, getSession } from "next-auth/react";
import { Header } from "@/components/Header";

/**
 * Parse response safely — never logs to external endpoints, never throws on HTML/empty.
 */
async function safeJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  if (!text.trim()) return {} as T;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return { error: "Server returned an unexpected response. Please retry." } as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: "Could not parse server response. Please retry." } as T;
  }
}

const EXTRACTION_STEPS = [
  "Fetching your website…",
  "Reading visual identity…",
  "Capturing color palette…",
  "Analyzing typography & tone…",
  "Building your Brand DNA…",
];

const IDEA_MODULES: {
  category: string;
  subtitle?: string;
  items: { title: string; description: string; prompt: string; icon: string }[];
}[] = [
  {
    category: "Social Media",
    subtitle: "Share on-brand content across platforms",
    items: [
      { title: "LinkedIn Post", description: "Share professional insights and thought leadership", prompt: "Full LinkedIn post image: professional layout with space for headline and copy, business-appropriate", icon: "💼" },
      { title: "Instagram Story", description: "Quick vertical content for stories and reels", prompt: "Full Instagram story or reel graphic: vertical 9:16, engaging visual with room for text, scroll-stopping", icon: "📱" },
      { title: "Twitter/X Post", description: "Shareable visuals for tweets and threads", prompt: "Full Twitter or X post image: shareable quote or visual graphic, concise and impactful", icon: "🐦" },
      { title: "YouTube Thumbnail", description: "Click-worthy preview images for videos", prompt: "Full YouTube thumbnail: bold imagery and text area, high contrast, click-worthy", icon: "▶️" },
      { title: "Facebook Post", description: "Engaging visuals for your Facebook audience", prompt: "Full Facebook post image: engaging visual, shareable, community-friendly", icon: "👍" },
      { title: "Pinterest Pin", description: "Discoverable pins that drive saves and clicks", prompt: "Full Pinterest pin graphic: vertical layout, inspirational or how-to style, discoverable", icon: "📌" },
    ],
  },
  {
    category: "Advertising",
    subtitle: "High-impact campaigns that convert",
    items: [
      { title: "Display Ad", description: "Banner ads for websites and app placements", prompt: "Display or banner ad, clear CTA, professional, conversion-focused", icon: "🎯" },
      { title: "Social Media Ad", description: "High-impact visual campaigns that convert", prompt: "Social media ad creative, high-impact, campaign-ready, conversion-focused", icon: "📢" },
      { title: "Product Launch", description: "Introduce a new product or feature with impact", prompt: "Product launch announcement visual, premium reveal, impactful and modern", icon: "🚀" },
    ],
  },
  {
    category: "Product Shot",
    subtitle: "Hero, lifestyle, and catalog visuals",
    items: [
      { title: "Hero Product Shot", description: "Clean, focused shot of a single product", prompt: "Hero product shot, clean studio lighting, single product focus, premium quality", icon: "📸" },
      { title: "Lifestyle Shot", description: "Products styled in real-world settings", prompt: "Lifestyle product shot, real-world setting, aspirational and authentic", icon: "🌿" },
      { title: "Photoshoot Studio", description: "Professional studio-quality product image", prompt: "Professional studio photoshoot, perfect lighting, clean background, high-end product photography", icon: "🎞️" },
    ],
  },
  {
    category: "Blog & Content",
    subtitle: "Set the scene for articles and downloads",
    items: [
      { title: "Blog Hero Image", description: "Set the scene for articles and posts", prompt: "Blog hero or header image, editorial quality, sets the tone for the article", icon: "📄" },
      { title: "Newsletter Header", description: "Create newsletters that engage and inform", prompt: "Newsletter header or banner, engaging and informative, on-brand", icon: "📧" },
      { title: "eBook / Guide Cover", description: "Professional covers for guides and downloads", prompt: "eBook or guide cover, professional, clear title area, download-ready", icon: "📚" },
    ],
  },
  {
    category: "Quote Card",
    subtitle: "Testimonials, thought leadership, and inspiration",
    items: [
      { title: "Customer Testimonial", description: "Showcase what others love about you", prompt: "Customer testimonial or quote card, authentic and trustworthy, branded background", icon: "💬" },
      { title: "Thought Leadership", description: "Share bold ideas and enhance your persona", prompt: "Thought leadership quote card, bold and authoritative, professional with brand colors", icon: "💡" },
      { title: "Inspirational Quote", description: "Uplifting messages with beautiful backgrounds", prompt: "Inspirational quote card, uplifting message, beautiful typography and background", icon: "✨" },
    ],
  },
  {
    category: "Profile Banner",
    subtitle: "Headers for your social and channel profiles",
    items: [
      { title: "LinkedIn Banner", description: "Professional header for your LinkedIn profile", prompt: "LinkedIn profile banner, professional header, wide format 1584x396, on-brand", icon: "💼" },
      { title: "Twitter/X Header", description: "Express your brand personality on Twitter/X", prompt: "Twitter or X profile header, brand personality, wide format 1500x500", icon: "🐦" },
      { title: "YouTube Channel Art", description: "Welcome banner for your YouTube channel", prompt: "YouTube channel art banner, welcoming, wide format, on-brand", icon: "▶️" },
    ],
  },
  {
    category: "Merchandise",
    subtitle: "Apparel and branded goods",
    items: [
      { title: "Streetwear Hoodie", description: "Bold urban hoodie designs", prompt: "Streetwear hoodie design mockup, bold typography, urban style, brand placement", icon: "👕" },
      { title: "Minimalist Tee", description: "Clean, subtle t-shirt graphics", prompt: "Minimalist t-shirt design, clean and subtle, premium tee mockup", icon: "👔" },
      { title: "Tote Bag", description: "Everyday branded tote designs", prompt: "Branded tote bag design, everyday carry, clean and usable", icon: "🛍️" },
    ],
  },
];

const CURATED_AESTHETICS = [
  { id: "streetwear", title: "Streetwear Merch", prompt: "Streetwear merchandise design, urban fashion, hoodie or jacket mockup, bold typography, modern street style, brand logo placement" },
  { id: "premium", title: "Premium Editorial", prompt: "Premium editorial photography, dramatic lighting, silhouetted figure, misty atmosphere, cinematic, high-end magazine style, aspirational" },
  { id: "minimal", title: "Minimal & Clean", prompt: "Minimalist design, clean composition, lots of white space, simple shapes, modern and elegant, professional" },
  { id: "vintage", title: "Vintage & Retro", prompt: "Vintage retro style, warm tones, film grain, nostalgic, classic design elements, timeless aesthetic" },
  { id: "tech", title: "Tech & Futuristic", prompt: "Futuristic tech design, neon accents, cyber aesthetic, modern technology, sleek and innovative" },
  { id: "luxury", title: "Luxury & Premium", prompt: "Luxury premium aesthetic, gold accents, rich textures, high-end materials, sophisticated elegance" },
  { id: "nature", title: "Organic & Natural", prompt: "Organic natural aesthetic, earth tones, sustainable feel, botanical elements, eco-friendly vibe" },
];

// Platform resize presets — full professional coverage
const RESIZE_PLATFORMS = [
  { label: "Instagram Post", aspectRatio: "1:1", size: "1080×1080", icon: "📷" },
  { label: "Instagram Story", aspectRatio: "9:16", size: "1080×1920", icon: "📱" },
  { label: "Facebook Post", aspectRatio: "1.91:1", size: "1200×628", icon: "👍" },
  { label: "LinkedIn Post", aspectRatio: "1.91:1", size: "1200×627", icon: "💼" },
  { label: "Twitter/X Post", aspectRatio: "16:9", size: "1600×900", icon: "🐦" },
  { label: "Pinterest Pin", aspectRatio: "2:3", size: "1000×1500", icon: "📌" },
  { label: "YouTube Thumb", aspectRatio: "16:9", size: "1280×720", icon: "▶️" },
  { label: "Square Ad", aspectRatio: "1:1", size: "1200×1200", icon: "🎯" },
];

const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "4:5", label: "Social (4:5)" },
  { value: "9:16", label: "Mobile Story (9:16)" },
  { value: "16:9", label: "Widescreen (16:9)" },
  { value: "1.91:1", label: "Landscape (1.91:1)" },
  { value: "2:3", label: "Portrait (2:3)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:3", label: "Landscape (4:3)" },
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
  values?: string[];
  targetAudience?: string;
  visualStyleSummary?: string;
  keyMessages?: string[];
  toneKeywords?: string[];
  aestheticNarrative?: string;
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

type GeneratedAsset = { id: string; url: string; label: string; type: string; width: number; height: number; prompt?: string };
type Phase = "extracting" | "generated" | "review" | "create" | "assets";

function parsePhaseFromQuery(stage: string | null): Phase {
  if (stage === "extracting" || stage === "generated" || stage === "review" || stage === "create" || stage === "assets") return stage;
  return "extracting";
}

const PENDING_BRAND_KEY = "brandbloom-pending-brand";

/** Safe image URL check */
function validBrandImageUrl(brand: BrandData | null): string | null {
  if (!brand) return null;
  const img = brand.image && !brand.image.endsWith(".mp4") ? brand.image : brand.logos?.[0];
  if (!img || typeof img !== "string") return null;
  const s = img.trim();
  if (!s || (!s.startsWith("http") && !s.startsWith("data:"))) return null;
  return s;
}

function toneChipsFromBrand(brand: BrandData | null): string[] {
  if (!brand) return [];
  if (brand.toneKeywords?.length) return brand.toneKeywords.slice(0, 8);
  const seen = new Set<string>();
  const add = (raw: string) => {
    raw.split(/[,;.]/).flatMap((s) => s.split(/\s+and\s+/i)).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 25).forEach((t) => seen.add(t));
  };
  if (brand.tone) add(brand.tone);
  if (brand.personality) add(brand.personality);
  return Array.from(seen).slice(0, 8);
}

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

function normalizeUrlForCompare(u: string): string {
  try { return decodeURIComponent(u.trim()).replace(/\/+$/, "") || u; } catch { return u; }
}

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

// ─── Drag-and-drop photo upload zone ──────────────────────────────────────────
function PhotoUploadZone({
  onFile,
  onUrl,
  loading,
  disabled,
}: {
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
  loading: boolean;
  disabled: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">📸 Upload & Brand Your Photo</p>
        <div className="flex gap-1 rounded-lg border border-surface-600 bg-surface-700 p-0.5 text-xs">
          <button type="button" onClick={() => setTab("upload")} className={`rounded-md px-3 py-1 font-medium transition ${tab === "upload" ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>Upload file</button>
          <button type="button" onClick={() => setTab("url")} className={`rounded-md px-3 py-1 font-medium transition ${tab === "url" ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>Paste URL</button>
        </div>
      </div>
      <p className="mb-3 text-xs text-stone-500">Upload your product photo or image — AI will style it to match your brand.</p>

      {tab === "upload" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !loading && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${dragOver ? "border-brand-500 bg-brand-500/10" : "border-surface-500 hover:border-brand-500/50 hover:bg-surface-700/30"} ${disabled || loading ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={disabled || loading} />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-sm text-stone-400">Branding your photo…</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-600 text-2xl">📁</div>
              <p className="text-sm font-medium text-white">Drop your image here</p>
              <p className="mt-1 text-xs text-stone-500">or click to browse — JPG, PNG, WebP, up to 10MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && urlInput.trim()) { onUrl(urlInput.trim()); setUrlInput(""); } }}
            placeholder="https://example.com/your-product.jpg"
            className="flex-1 rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            disabled={disabled || loading}
          />
          <button
            type="button"
            disabled={loading || !urlInput.trim() || disabled}
            onClick={() => { if (urlInput.trim()) { onUrl(urlInput.trim()); setUrlInput(""); } }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-60"
          >
            {loading ? "…" : "Brand it"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Editable Brand DNA panel (Pomelli-style full editor) ─────────────────────
function BrandDNAEditor({
  brand,
  onChange,
  onClose,
}: {
  brand: BrandData;
  onChange: (updated: BrandData) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<BrandData>({ ...brand });
  const [colorInput, setColorInput] = useState((brand.colors ?? []).join(", "));
  const [fontsInput, setFontsInput] = useState((brand.fonts ?? []).join(", "));
  const [valuesInput, setValuesInput] = useState((brand.values ?? []).join(", "));
  const [keyMessagesInput, setKeyMessagesInput] = useState((brand.keyMessages ?? []).join(" | "));
  const [toneKeywordsInput, setToneKeywordsInput] = useState((brand.toneKeywords ?? []).join(", "));

  function save() {
    const updated: BrandData = {
      ...local,
      colors: colorInput.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 8),
      fonts: fontsInput.split(",").map((f) => f.trim()).filter(Boolean),
      values: valuesInput.split(",").map((v) => v.trim()).filter(Boolean),
      keyMessages: keyMessagesInput.split("|").map((m) => m.trim()).filter(Boolean),
      toneKeywords: toneKeywordsInput.split(",").map((t) => t.trim()).filter(Boolean),
    };
    onChange(updated);
    onClose();
  }

  const field = (label: string, key: keyof BrandData, placeholder = "") => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</label>
      <input
        type="text"
        value={(local[key] as string) ?? ""}
        onChange={(e) => setLocal((b) => ({ ...b, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
      />
    </div>
  );

  const textarea = (label: string, key: keyof BrandData, placeholder = "", rows = 2) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</label>
      <textarea
        value={(local[key] as string) ?? ""}
        onChange={(e) => setLocal((b) => ({ ...b, [key]: e.target.value }))}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
      />
    </div>
  );

  return (
    <div className="mb-10 rounded-2xl border border-brand-500/30 bg-surface-800/60 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Edit Brand DNA</h2>
          <p className="mt-0.5 text-xs text-stone-500">All changes improve generated asset quality</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-surface-500 px-3 py-1.5 text-xs text-stone-400 hover:text-white">Discard</button>
          <button type="button" onClick={save} className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-400">Save changes</button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Identity */}
        <div className="space-y-4 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Identity</p>
          {field("Brand name", "name", "e.g. Acme Corp")}
          {field("Tagline", "tagline", "e.g. Building for tomorrow")}
          {textarea("Description", "description", "What your brand does and stands for…", 3)}
        </div>

        {/* Visual */}
        <div className="space-y-4 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Visual Identity</p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Colors (hex, comma-separated)</label>
            <input
              type="text"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              placeholder="#1a1a2e, #16213e, #0f3460"
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
            />
            {/* Live color preview */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {colorInput.split(",").map((c) => c.trim()).filter((c) => /^#[0-9a-fA-F]{3,6}$/.test(c)).map((c) => (
                <span key={c} className="h-7 w-7 rounded-md border border-surface-500" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Fonts (comma-separated)</label>
            <input
              type="text"
              value={fontsInput}
              onChange={(e) => setFontsInput(e.target.value)}
              placeholder="Inter, Playfair Display"
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
            />
          </div>
          {textarea("Aesthetic / Visual narrative", "aestheticNarrative", "Describe the visual style, mood, and feel…")}
        </div>

        {/* Tone & Voice */}
        <div className="space-y-4 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tone & Voice</p>
          {field("Personality", "personality", "e.g. Bold, innovative, approachable")}
          {field("Tone", "tone", "e.g. Professional, warm, direct")}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Tone keywords (comma-separated)</label>
            <input
              type="text"
              value={toneKeywordsInput}
              onChange={(e) => setToneKeywordsInput(e.target.value)}
              placeholder="innovative, bold, trustworthy, modern"
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Strategy */}
        <div className="space-y-4 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Strategy</p>
          {field("Target audience", "targetAudience", "e.g. B2B SaaS founders, 25-45")}
          {field("Visual style summary", "visualStyleSummary", "e.g. Minimal, dark mode, editorial")}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Brand values (comma-separated)</label>
            <input
              type="text"
              value={valuesInput}
              onChange={(e) => setValuesInput(e.target.value)}
              placeholder="innovation, transparency, quality"
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Key messages (separate with |)</label>
            <input
              type="text"
              value={keyMessagesInput}
              onChange={(e) => setKeyMessagesInput(e.target.value)}
              placeholder="We help X achieve Y | Built for Z"
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-surface-500 px-4 py-2 text-sm text-stone-300 hover:text-white">Discard changes</button>
        <button type="button" onClick={save} className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-400">✓ Save Brand DNA</button>
      </div>
    </div>
  );
}

// ─── Image editor panel — prompt-based AI editing + text overlay ───────────
function ImageEditorPanel({
  asset,
  brand,
  onRegenerate,
  onVariation,
  generating,
}: {
  asset: GeneratedAsset;
  brand: BrandData | null;
  onRegenerate: (prompt: string, quality: "standard" | "4k") => void;
  onVariation: (quality: "standard" | "4k") => void;
  generating: boolean;
}) {
  const [editPrompt, setEditPrompt] = useState(asset.prompt ?? "");
  const [quality, setQuality] = useState<"standard" | "4k">("standard");
  const [editMode, setEditMode] = useState<"prompt" | "style">("prompt");

  const QUICK_EDITS = [
    "More dramatic lighting",
    "Darker, moodier atmosphere",
    "Brighter, more vibrant colors",
    "Add bokeh background blur",
    "Cinematic film grain",
    "Ultra minimal, lots of white space",
    "Gold and black luxury feel",
    "Neon glow tech aesthetic",
    "Organic, natural, earthy tones",
    "Bold typography overlay",
  ];

  return (
    <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">✏️ Image Editor</p>
        <div className="flex gap-1 rounded-lg border border-surface-600 bg-surface-700 p-0.5 text-xs">
          <button type="button" onClick={() => setEditMode("prompt")} className={`rounded-md px-3 py-1 font-medium transition ${editMode === "prompt" ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>Edit prompt</button>
          <button type="button" onClick={() => setEditMode("style")} className={`rounded-md px-3 py-1 font-medium transition ${editMode === "style" ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>Quick styles</button>
        </div>
      </div>

      {editMode === "prompt" ? (
        <textarea
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          rows={4}
          placeholder="Describe changes: different background, new headline, change style…"
          className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_EDITS.map((edit) => (
            <button
              key={edit}
              type="button"
              onClick={() => { setEditPrompt((p) => p ? `${p}, ${edit.toLowerCase()}` : edit); setEditMode("prompt"); }}
              className="rounded-lg border border-surface-500 bg-surface-700/50 px-2 py-1.5 text-left text-xs text-stone-300 hover:border-brand-500/50 hover:text-white"
            >
              + {edit}
            </button>
          ))}
        </div>
      )}

      {/* 4K Toggle */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-surface-600 bg-surface-700/50 px-3 py-2">
        <button
          type="button"
          onClick={() => setQuality(quality === "standard" ? "4k" : "standard")}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${quality === "4k" ? "bg-brand-500" : "bg-surface-500"}`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${quality === "4k" ? "translate-x-4" : "translate-x-0"}`} />
        </button>
        <span className="text-xs text-stone-300">4K output {quality === "4k" ? <span className="text-brand-400 font-semibold">(enabled — uses 2 credits)</span> : "(Standard)"}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={generating}
          onClick={() => onRegenerate(editPrompt, quality)}
          className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-60"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {quality === "4k" ? "Generating 4K…" : "Regenerating…"}
            </span>
          ) : `Regenerate${quality === "4k" ? " in 4K" : ""}`}
        </button>
        <button
          type="button"
          disabled={generating}
          onClick={() => onVariation(quality)}
          className="rounded-lg border border-surface-500 px-4 py-2 text-sm font-medium text-white hover:border-surface-400 disabled:opacity-60"
        >
          Variation
        </button>
      </div>
    </div>
  );
}


function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const url = searchParams.get("url") ?? "";
  const brandIdParam = searchParams.get("brandId");
  const promptParam = searchParams.get("prompt");
  const stage = searchParams.get("stage");

  const extractionStartedRef = useRef(false);
  const brandIdLoadedRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>(() => parsePhaseFromQuery(stage));
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(36);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [createPrompt, setCreatePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("__auto__");
  const [quality4k, setQuality4k] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<GeneratedAsset[] | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [replicateAttempted, setReplicateAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realImagesAvailable, setRealImagesAvailable] = useState<boolean | null>(null);
  const [extractRetryKey, setExtractRetryKey] = useState(0);

  // Photo upload
  const [uploadLoading, setUploadLoading] = useState(false);

  // Resize
  const [resizingPlatform, setResizingPlatform] = useState<string | null>(null);

  // Ideas
  const [selectedIdeaType, setSelectedIdeaType] = useState<string>("");
  const [selectedIdeaTags, setSelectedIdeaTags] = useState<string[]>([]);

  // Editor
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [editorPrompt, setEditorPrompt] = useState("");

  // Brand DNA editor
  const [dnaEditorOpen, setDnaEditorOpen] = useState(false);
  const [reviewViewTab, setReviewViewTab] = useState<"kit" | "strategy">("kit");

  const displayUrl = url ? decodeURIComponent(url) : brandIdParam && !url ? "Logo-based brand" : "";
  const domain = brand?.domain ?? (url ? (() => { try { return new URL(decodeURIComponent(url)).hostname.replace(/^www\./, ""); } catch { return ""; } })() : brandIdParam ? "—" : "");

  const goToPhase = useCallback((next: Phase) => {
    setPhase(next);
    const params = new URLSearchParams();
    if (url) params.set("url", decodeURIComponent(url));
    params.set("stage", next);
    if (brandIdParam) params.set("brandId", brandIdParam);
    if (promptParam) params.set("prompt", promptParam);
    router.replace(`/analyze?${params.toString()}`);
  }, [url, router, brandIdParam, promptParam]);

  const phaseInitialized = useRef(false);
  useEffect(() => {
    if (!phaseInitialized.current) {
      phaseInitialized.current = true;
      setPhase(parsePhaseFromQuery(stage));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!promptParam) return;
    try { setCreatePrompt(decodeURIComponent(promptParam)); } catch { setCreatePrompt(promptParam); }
  }, [promptParam]);

  useEffect(() => {
    if (status === "unauthenticated" && (url || brandIdParam)) {
      // Decode url first to prevent double-encoding when user returns from login
      const rawUrl = url ? (() => { try { return decodeURIComponent(url); } catch { return url; } })() : "";
      const callback = rawUrl
        ? `/analyze?url=${encodeURIComponent(rawUrl)}`
        : brandIdParam
        ? `/analyze?brandId=${encodeURIComponent(brandIdParam)}&stage=${encodeURIComponent(stage ?? "review")}`
        : "/";
      router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
    }
    // When user returns authenticated, allow extraction to run
    if (status === "authenticated" && url) {
      extractionStartedRef.current = false;
    }
  }, [status, url, brandIdParam, stage, router]);

  useEffect(() => {
    if (!brandIdParam || status !== "authenticated") return;
    if (brandIdLoadedRef.current === brandIdParam) return;
    brandIdLoadedRef.current = brandIdParam;

    fetch(`/api/brands/${brandIdParam}`, { credentials: "include" })
      .then(async (r) => ({ ok: r.ok, data: await safeJson(r) }))
      .then(({ ok, data }) => {
        if (!ok || !(data as { brand?: BrandData }).brand) return;
        const loaded = (data as { brand: BrandData & { assets?: Array<{ id: string; url: string; label: string; type: string; width: number; height: number; prompt?: string | null }> } }).brand;
        setBrand(loaded);
        const existingAssets = (loaded.assets ?? [])
          .filter((a) => typeof a.url === "string" && a.url.startsWith("http"))
          .map((a) => ({ id: a.id, url: a.url, label: a.label, type: a.type, width: a.width, height: a.height, prompt: a.prompt ?? undefined }));
        if (existingAssets.length) {
          setAssets(existingAssets);
          setSelectedAssetId(existingAssets[0].id);
          setEditorPrompt(loaded.assets?.[0]?.prompt ?? "");
          const targetPhase = parsePhaseFromQuery(stage) === "assets" ? "assets" : parsePhaseFromQuery(stage) === "review" ? "review" : "create";
          setPhase(targetPhase);
        } else {
          const targetPhase = parsePhaseFromQuery(stage) === "review" ? "review" : "create";
          setPhase(targetPhase);
        }
      })
      .catch(() => { /* silently ignore */ });
  }, [brandIdParam, status, stage]);

  // URL-based extraction — runs when authenticated and url param is present
  // extractionStartedRef is reset in the auth useEffect above when user returns from login
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
          setPhase("review");
          sessionStorage.removeItem(PENDING_BRAND_KEY);
          return;
        }
      }
    } catch { /* ignore */ }

    if (extractionStartedRef.current) return;
    extractionStartedRef.current = true;

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);
    const decodedUrl = decodeURIComponent(url);

    setPhase("extracting");
    setExtractError(null);
    setStepIndex(0);
    setSecondsLeft(36);

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
        try { data = await res.json(); } catch { data = { error: "Invalid response from server." }; }

        if (cancelled) return;
        clearTimeout(timeoutId);

        if (res.status === 401) {
          router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${encodeURIComponent(url)}`)}`);
          return;
        }

        if (res.ok && data && !data.error) {
          setBrand(data as BrandData);
          setExtractError(null);
          setStepIndex(EXTRACTION_STEPS.length);
          setSecondsLeft(0);
          setTimeout(() => setPhase("review"), 600);
        } else {
          const serverError = data.error ?? "Could not analyze this URL.";
          const is5xx = res.status >= 500;
          setExtractError(is5xx ? "This request took longer than expected. Please try again." : serverError);
          setStepIndex(EXTRACTION_STEPS.length);
          setPhase("generated");
        }
      } catch (e) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        const isAbort = (e as Error).name === "AbortError";
        setStepIndex(EXTRACTION_STEPS.length);
        setSecondsLeft(0);
        setBrand(null);
        setExtractError(isAbort ? "Request timed out (55s). Please try again with your homepage URL." : "Network error — check your connection and try again.");
        setPhase("generated");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [url, status, extractRetryKey, brandIdParam]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setStepIndex((i) => (i < EXTRACTION_STEPS.length - 1 ? i + 1 : i));
    }, 7000);
    const timerInterval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => { clearInterval(stepInterval); clearInterval(timerInterval); };
  }, [phase, url]);

  function saveBrandBeforeLoginRedirect() {
    try {
      if (url && brand) sessionStorage.setItem(PENDING_BRAND_KEY, JSON.stringify({ url, brand }));
    } catch { /* ignore */ }
  }

  async function fetchWithAuthRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const first = await fetch(input, { credentials: "include", ...init });
    if (first.status !== 401) return first;
    await getSession();
    return fetch(input, { credentials: "include", ...init });
  }

  async function handleCreate(promptText: string, overrideQuality?: "standard" | "4k") {
    if (!url && !brand) return;
    const prompt = promptText.trim() || "Professional branded image";
    const use4k = overrideQuality ? overrideQuality === "4k" : quality4k;
    setError(null);
    setGenerating(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetchWithAuthRetry("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url ? decodeURIComponent(url) : undefined,
          brand: brand ? {
            name: brand.name, colors: brand.colors, description: brand.description,
            tagline: brand.tagline, fonts: brand.fonts, logos: brand.logos,
            socialAccounts: brand.socialAccounts, personality: brand.personality,
            tone: brand.tone, visualStyleSummary: brand.visualStyleSummary,
            aestheticNarrative: brand.aestheticNarrative,
            targetAudience: brand.targetAudience,
            toneKeywords: brand.toneKeywords,
            values: brand.values,
          } : undefined,
          brandId: brand?.brandId ?? undefined,
          ideaType: selectedIdeaType || undefined,
          limit: 1,
          promptOverride: prompt,
          aspectRatio: aspectRatio === "__auto__" ? "1:1" : aspectRatio,
          quality: use4k ? "4k" : "standard",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await safeJson<{ assets?: GeneratedAsset[]; error?: string; credits?: number; demo?: boolean; replicateAttempted?: boolean }>(res);

      if (res.status === 401) {
        saveBrandBeforeLoginRedirect();
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${url ? encodeURIComponent(url) : ""}`)}`);
        return;
      }
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");

      const newAssets = (data.assets ?? []) as GeneratedAsset[];
      const withPrompt = newAssets.map((a) => ({ ...a, prompt }));
      setAssets((prev) => prev ? [...prev, ...withPrompt] : withPrompt);
      if (withPrompt[0]?.id) setSelectedAssetId(withPrompt[0].id);
      setEditorPrompt(prompt);
      setDemoMode(!!data.demo);
      setReplicateAttempted(!!data.replicateAttempted);
      setPhase("assets");
      if (typeof data.credits === "number") window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setError("Generation timed out (2 min). Try again or use a simpler prompt.");
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateVariation(overrideQuality?: "standard" | "4k") {
    if (!brand) return;
    const use4k = overrideQuality ? overrideQuality === "4k" : quality4k;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetchWithAuthRetry("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url ? decodeURIComponent(url) : undefined,
          brand: { name: brand.name, colors: brand.colors, description: brand.description, tagline: brand.tagline, fonts: brand.fonts, logos: brand.logos, socialAccounts: brand.socialAccounts, personality: brand.personality, tone: brand.tone, visualStyleSummary: brand.visualStyleSummary, aestheticNarrative: brand.aestheticNarrative, targetAudience: brand.targetAudience, toneKeywords: brand.toneKeywords, values: brand.values },
          brandId: brand.brandId ?? undefined,
          ideaType: selectedIdeaType || undefined,
          limit: 1,
          promptOverride: (editorPrompt || createPrompt).trim() ? (editorPrompt || createPrompt) + ", creative variation, same brand style" : "Creative variation of branded image",
          aspectRatio: "1:1",
          quality: use4k ? "4k" : "standard",
        }),
      });
      const data = await safeJson<{ assets?: GeneratedAsset[]; error?: string; credits?: number }>(res);
      if (!res.ok || data.error) throw new Error(data.error ?? "Variation failed");
      if (data.assets?.length) {
        const newAsset: GeneratedAsset = { ...(data.assets[0] as GeneratedAsset), id: String(Date.now()), label: "Variation", prompt: editorPrompt || createPrompt };
        setAssets((prev) => [...(prev ?? []), newAsset]);
        setSelectedAssetId(newAsset.id);
      }
      if (typeof data.credits === "number") window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Variation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleResizeForPlatform(platformAspect: string, platformLabel: string) {
    if (!brand) return;
    setResizingPlatform(platformLabel);
    setError(null);
    try {
      const res = await fetchWithAuthRetry("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url ? decodeURIComponent(url) : undefined,
          brand: { name: brand.name, colors: brand.colors, description: brand.description, tagline: brand.tagline, fonts: brand.fonts, logos: brand.logos, socialAccounts: brand.socialAccounts, personality: brand.personality, tone: brand.tone, visualStyleSummary: brand.visualStyleSummary, aestheticNarrative: brand.aestheticNarrative },
          brandId: brand.brandId ?? undefined,
          ideaType: selectedIdeaType || undefined,
          limit: 1,
          promptOverride: editorPrompt || createPrompt || "Professional branded image",
          aspectRatio: platformAspect,
        }),
      });
      const data = await safeJson<{ assets?: GeneratedAsset[]; error?: string; credits?: number }>(res);
      if (!res.ok || data.error) throw new Error(data.error ?? "Resize failed");
      if (data.assets?.length) {
        const newAsset: GeneratedAsset = { ...(data.assets[0] as GeneratedAsset), id: String(Date.now()), label: platformLabel, prompt: editorPrompt || createPrompt };
        setAssets((prev) => [...(prev ?? []), newAsset]);
        setSelectedAssetId(newAsset.id);
      }
      if (typeof data.credits === "number") window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resize failed");
    } finally {
      setResizingPlatform(null);
    }
  }

  // File upload → branded (actual file, not just URL)
  async function handlePhotoFile(file: File) {
    if (!brand) return;
    setUploadLoading(true);
    setError(null);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:image/...;base64, prefix
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const res = await fetchWithAuthRetry("/api/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
          brand: { name: brand.name, colors: brand.colors, description: brand.description, personality: brand.personality, tone: brand.tone, aestheticNarrative: brand.aestheticNarrative, targetAudience: brand.targetAudience },
          brandId: brand.brandId ?? undefined,
        }),
      });

      if (res.status === 401) {
        saveBrandBeforeLoginRedirect();
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${url ? encodeURIComponent(url) : ""}`)}`);
        return;
      }

      const data = await safeJson<{ url?: string; label?: string; error?: string; credits?: number }>(res);
      if (!res.ok || data.error) throw new Error(data.error ?? "Photo branding failed");
      if (typeof data.credits === "number") window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
      if (data.url) {
        const uploadedAsset: GeneratedAsset = { id: String(Date.now()), url: data.url, label: data.label || "Branded photo", type: "photo", width: 1024, height: 1024 };
        setAssets((prev) => [...(prev ?? []), uploadedAsset]);
        setSelectedAssetId(uploadedAsset.id);
        setEditorPrompt("Branded version of uploaded photo");
        setPhase("assets");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploadLoading(false);
    }
  }

  async function handlePhotoUrl(imageUrl: string) {
    if (!brand) return;
    setUploadLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuthRetry("/api/upload-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, brand: { name: brand.name, colors: brand.colors, description: brand.description, personality: brand.personality, tone: brand.tone, aestheticNarrative: brand.aestheticNarrative } }),
      });

      if (res.status === 401) {
        saveBrandBeforeLoginRedirect();
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/analyze?url=${url ? encodeURIComponent(url) : ""}`)}`);
        return;
      }

      const data = await safeJson<{ url?: string; label?: string; error?: string; credits?: number }>(res);
      if (!res.ok || data.error) throw new Error(data.error ?? "Photo branding failed");
      if (typeof data.credits === "number") window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
      if (data.url) {
        const uploadedAsset: GeneratedAsset = { id: String(Date.now()), url: data.url, label: data.label || "Branded photo", type: "photo", width: 1024, height: 1024 };
        setAssets((prev) => [...(prev ?? []), uploadedAsset]);
        setSelectedAssetId(uploadedAsset.id);
        setEditorPrompt("Branded version of photo");
        setPhase("assets");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo URL branding failed");
    } finally {
      setUploadLoading(false);
    }
  }

  // ─── EXTRACTING phase ────────────────────────────────────────────────────────
  if (phase === "extracting") {
    return (
      <main className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-24 pb-24">
          <div className="w-full max-w-md text-center">
            <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
              <div className="relative h-14 w-14 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white">Analyzing your brand…</h1>
            <p className="mb-2 text-sm text-stone-400 break-all">{displayUrl}</p>
            <p className="mb-8 text-sm text-stone-500">~{Math.max(0, secondsLeft)}s remaining</p>
            <div className="space-y-3">
              {EXTRACTION_STEPS.map((step, i) => (
                <div key={step} className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${i < stepIndex ? "border-brand-500/30 bg-brand-500/10 text-brand-300" : i === stepIndex ? "border-surface-500 bg-surface-800/80 text-white" : "border-surface-700 bg-surface-900/50 text-stone-600"}`}>
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${i < stepIndex ? "bg-brand-500 text-white" : i === stepIndex ? "border-2 border-brand-500" : "border border-surface-600"}`}>
                    {i < stepIndex ? "✓" : i === stepIndex ? <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> : ""}
                  </div>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─── GENERATED (error or success notice) phase ───────────────────────────────
  if (phase === "generated") {
    return (
      <main className="flex min-h-screen flex-col">
        <Header />
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-32 pb-24 text-center">
          {extractError ? (
            <>
              <div className="mb-6 rounded-full bg-red-500/10 p-4 text-3xl">⚠️</div>
              <h1 className="mb-2 text-2xl font-bold text-white">Extraction failed</h1>
              <p className="mb-6 text-stone-400">{extractError}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => { extractionStartedRef.current = false; setExtractError(null); setStepIndex(0); setSecondsLeft(36); setExtractRetryKey((k) => k + 1); setPhase("extracting"); }}
                  className="rounded-xl bg-brand-500 px-8 py-4 font-semibold text-white hover:bg-brand-400"
                >
                  Retry extraction
                </button>
                <Link href="/" className="rounded-xl border border-surface-500 px-8 py-4 font-semibold text-white hover:bg-surface-800">
                  Try another URL
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-full bg-brand-500/10 p-4 text-4xl">✨</div>
              <h1 className="mb-2 text-3xl font-bold text-white">Brand identity extracted!</h1>
              <p className="mb-8 text-stone-400">Your Brand DNA is ready. Review and edit it before creating assets.</p>
              <button type="button" onClick={() => setPhase("review")} className="rounded-xl bg-brand-500 px-10 py-4 text-lg font-semibold text-white hover:bg-brand-400">
                Review Brand DNA →
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  // ─── REVIEW phase ────────────────────────────────────────────────────────────
  if (phase === "review") {
    if (!brand) {
      return (
        <main className="min-h-screen">
          <Header />
          <div className="mx-auto max-w-4xl px-4 pt-24 pb-24 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">No brand data yet</h1>
            <p className="mb-6 text-stone-400">Run extraction first to build your Brand DNA.</p>
            <button type="button" onClick={() => { extractionStartedRef.current = false; setExtractError(null); setStepIndex(0); setSecondsLeft(36); setExtractRetryKey((k) => k + 1); setPhase("extracting"); }} className="rounded-xl bg-brand-500 px-8 py-4 text-lg font-semibold text-white hover:bg-brand-400">Run extraction</button>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-5xl px-4 pt-24 pb-24">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                {validBrandImageUrl(brand) ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                    <Image src={validBrandImageUrl(brand)!} alt="" fill unoptimized className="object-contain" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 font-bold text-brand-400">{brand.name.slice(0, 1)}</div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white">{brand.name}</h1>
                  {brand.tagline && <p className="text-sm text-stone-400">"{brand.tagline}"</p>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDnaEditorOpen((v) => !v)} className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${dnaEditorOpen ? "border-brand-500 text-white" : "border-surface-500 text-stone-300 hover:border-surface-400 hover:text-white"}`}>
                {dnaEditorOpen ? "✓ Editing DNA" : "✏️ Edit Brand DNA"}
              </button>
              <button type="button" onClick={() => { extractionStartedRef.current = false; setExtractError(null); setStepIndex(0); setSecondsLeft(36); setExtractRetryKey((k) => k + 1); setPhase("extracting"); }} className="rounded-xl border border-surface-500 px-4 py-2.5 text-sm font-medium text-stone-400 hover:border-surface-400">
                Re-extract
              </button>
              <button type="button" onClick={() => setPhase("create")} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-400">
                Create Assets →
              </button>
            </div>
          </div>

          {/* DNA Editor (full Pomelli-style) */}
          {dnaEditorOpen && (
            <BrandDNAEditor
              brand={brand}
              onChange={(updated) => { setBrand(updated); }}
              onClose={() => setDnaEditorOpen(false)}
            />
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-2 border-b border-surface-600">
            <button type="button" onClick={() => setReviewViewTab("kit")} className={`pb-3 text-sm font-medium transition ${reviewViewTab === "kit" ? "border-b-2 border-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>Brand Kit</button>
            <button type="button" onClick={() => setReviewViewTab("strategy")} className={`pb-3 text-sm font-medium transition ${reviewViewTab === "strategy" ? "border-b-2 border-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>Strategy Intelligence</button>
          </div>

          {reviewViewTab === "strategy" && brand.strategyProfile ? (
            <div className="space-y-6">
              {brand.strategyProfile.audienceProfile && (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Audience</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {brand.strategyProfile.audienceProfile.primaryAudience && <div><p className="text-xs text-stone-500">Primary</p><p className="mt-1 text-sm text-stone-300">{brand.strategyProfile.audienceProfile.primaryAudience}</p></div>}
                    {brand.strategyProfile.audienceProfile.secondaryAudience && <div><p className="text-xs text-stone-500">Secondary</p><p className="mt-1 text-sm text-stone-300">{brand.strategyProfile.audienceProfile.secondaryAudience}</p></div>}
                    {brand.strategyProfile.audienceProfile.painPoints?.length ? <div><p className="text-xs text-stone-500">Pain Points</p><ul className="mt-1 space-y-1">{brand.strategyProfile.audienceProfile.painPoints.map((p, i) => <li key={i} className="text-sm text-stone-400">• {p}</li>)}</ul></div> : null}
                    {brand.strategyProfile.audienceProfile.motivations?.length ? <div><p className="text-xs text-stone-500">Motivations</p><ul className="mt-1 space-y-1">{brand.strategyProfile.audienceProfile.motivations.map((m, i) => <li key={i} className="text-sm text-stone-400">• {m}</li>)}</ul></div> : null}
                  </div>
                </section>
              )}
              {brand.strategyProfile.positioning && (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Positioning</h2>
                  <div className="space-y-2">
                    {brand.strategyProfile.positioning.category && <p className="text-sm text-stone-300"><span className="text-stone-500">Category:</span> {brand.strategyProfile.positioning.category}</p>}
                    {brand.strategyProfile.positioning.differentiation && <p className="text-sm text-stone-300"><span className="text-stone-500">Differentiation:</span> {brand.strategyProfile.positioning.differentiation}</p>}
                    {brand.strategyProfile.positioning.marketLevel && <p className="text-sm text-stone-300"><span className="text-stone-500">Market level:</span> {brand.strategyProfile.positioning.marketLevel}</p>}
                  </div>
                </section>
              )}
              {brand.strategyProfile.brandArchetype && (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Brand archetype</h2>
                  <p className="text-sm font-semibold text-white">{brand.strategyProfile.brandArchetype}</p>
                </section>
              )}
              {brand.strategyProfile.contentPillars?.length ? (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Content pillars</h2>
                  <div className="flex flex-wrap gap-2">
                    {brand.strategyProfile.contentPillars.map((pillar, i) => <span key={i} className="rounded-full bg-surface-600 px-3 py-1 text-sm text-stone-300">{pillar}</span>)}
                  </div>
                </section>
              ) : null}
              {brand.strategyProfile.messagingAngles?.length ? (
                <section className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">Messaging angles</h2>
                  <ul className="space-y-2">{brand.strategyProfile.messagingAngles.map((m, i) => <li key={i} className="text-sm text-stone-400">→ {m}</li>)}</ul>
                </section>
              ) : null}
            </div>
          ) : reviewViewTab === "strategy" && !brand.strategyProfile ? (
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-8 text-center">
              <p className="mb-2 text-stone-400">Strategy profile not available.</p>
              <p className="text-sm text-stone-500">Add <code className="rounded bg-surface-600 px-1">OPENAI_API_KEY</code> or <code className="rounded bg-surface-600 px-1">ANTHROPIC_API_KEY</code> to your <code className="rounded bg-surface-600 px-1">.env</code> and re-extract for strategic intelligence.</p>
            </div>
          ) : null}

          {reviewViewTab === "kit" && (
            <div className="grid gap-8 lg:grid-cols-2">
              <section className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Identity</h2>
                <div className="flex items-center gap-4 rounded-xl border border-surface-600 bg-surface-800/50 p-5">
                  {validBrandImageUrl(brand) ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                      <Image src={validBrandImageUrl(brand)!} alt="" fill unoptimized className="object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-2xl font-bold text-brand-400">{brand.name.slice(0, 1)}</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{brand.name}</p>
                    {brand.tagline ? <p className="mt-0.5 text-sm text-stone-400">"{brand.tagline}"</p> : null}
                    {brand.targetAudience ? <p className="mt-1 text-xs text-stone-500">→ {brand.targetAudience}</p> : null}
                  </div>
                </div>
                {brand.description && (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Description</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-400">{brand.description}</p>
                  </div>
                )}
                {brand.values?.length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Values</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {brand.values.map((v) => <span key={v} className="rounded-full border border-surface-500 px-2.5 py-0.5 text-xs text-stone-300">{v}</span>)}
                    </div>
                  </div>
                ) : null}
                {brand.keyMessages?.length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Key messages</p>
                    <ul className="mt-2 space-y-1">
                      {brand.keyMessages.slice(0, 3).map((m, i) => <li key={i} className="text-sm text-stone-400">→ {m}</li>)}
                    </ul>
                  </div>
                ) : null}
              </section>

              <section className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Design Language</h2>
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Colors</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {brand.colors?.length ? brand.colors.map((c) => (
                      <div key={c} className="flex flex-col items-center gap-1">
                        <span className="h-10 w-10 rounded-lg border border-surface-500 shadow-inner" style={{ backgroundColor: c }} title={c} />
                        <span className="text-xs text-stone-600">{c}</span>
                      </div>
                    )) : <span className="text-sm text-stone-500">—</span>}
                  </div>
                </div>
                {brand.fonts?.length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Fonts</p>
                    <div className="mt-3 flex flex-wrap gap-4">
                      {brand.fonts.slice(0, 3).map((fontName) => <FontSample key={fontName} name={fontName} />)}
                    </div>
                  </div>
                ) : null}
                {toneChipsFromBrand(brand).length ? (
                  <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Tone & Personality</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {toneChipsFromBrand(brand).map((chip) => <span key={chip} className="rounded-full bg-surface-600 px-2.5 py-0.5 text-xs text-stone-300">{chip}</span>)}
                    </div>
                  </div>
                ) : null}
                <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Aesthetic</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-400">{aestheticParagraphFromBrand(brand)}</p>
                </div>
              </section>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={() => setPhase("create")} className="rounded-xl bg-brand-500 px-8 py-3 font-semibold text-white hover:bg-brand-400">
              Continue to Create Assets →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── CREATE phase ────────────────────────────────────────────────────────────
  if (phase === "create") {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto flex max-w-6xl gap-8 px-4 pt-24 pb-24">
          {/* Sidebar */}
          <aside className="hidden w-72 shrink-0 space-y-6 lg:block">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Brand Kit</h2>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-surface-600 bg-surface-800/50 p-3">
                {validBrandImageUrl(brand) ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                    <Image src={validBrandImageUrl(brand)!} alt="" fill unoptimized className="object-contain" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/30 text-base font-bold text-brand-400">{brand?.name?.slice(0, 1) ?? "?"}</div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{brand?.name ?? "Brand"}</p>
                  {brand?.domain && <p className="truncate text-xs text-stone-500">{brand.domain}</p>}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setPhase("review")} className="text-xs text-brand-400 hover:text-brand-300">View Brand DNA</button>
                <span className="text-stone-600">·</span>
                <button type="button" onClick={() => setDnaEditorOpen(true)} className="text-xs text-stone-500 hover:text-stone-300">Edit</button>
              </div>
            </div>

            {brand?.colors?.length ? (
              <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">Colors</p>
                <div className="flex flex-wrap gap-1.5">
                  {brand.colors.map((c) => <span key={c} className="h-8 w-8 rounded-lg border border-surface-500 shadow-inner" style={{ backgroundColor: c }} title={c} />)}
                </div>
              </div>
            ) : null}

            {brand?.description && (
              <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Description</p>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-400 line-clamp-4">{brand.description}</p>
              </div>
            )}

            {toneChipsFromBrand(brand).length ? (
              <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">Tone</p>
                <div className="flex flex-wrap gap-1">
                  {toneChipsFromBrand(brand).map((chip) => <span key={chip} className="rounded-full bg-surface-600 px-2 py-0.5 text-xs text-stone-300">{chip}</span>)}
                </div>
              </div>
            ) : null}

            {brand?.aestheticNarrative && (
              <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Aesthetic</p>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-400 line-clamp-4">{brand.aestheticNarrative}</p>
              </div>
            )}
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {dnaEditorOpen && brand && (
              <BrandDNAEditor brand={brand} onChange={(updated) => setBrand(updated)} onClose={() => setDnaEditorOpen(false)} />
            )}

            <h2 className="mb-1 text-2xl font-bold text-white">What will you create?</h2>
            <p className="mb-5 text-sm text-stone-400">Describe what you need, or pick a template below.</p>

            {realImagesAvailable === false && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="text-sm text-amber-200"><span className="font-medium">Placeholder mode:</span> Add <code className="rounded bg-amber-500/20 px-1">REPLICATE_API_TOKEN</code> for real AI images. <Link href="/setup#images" className="underline hover:text-amber-100">Setup guide →</Link></p>
              </div>
            )}
            {realImagesAvailable === true && <p className="mb-4 text-xs text-green-400/90">✓ AI image generation active</p>}

            {/* Main prompt + controls */}
            <div className="mb-5 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={createPrompt}
                  onChange={(e) => setCreatePrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !generating && createPrompt.trim()) handleCreate(createPrompt); }}
                  placeholder="Describe what you want to create…"
                  className="flex-1 rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
                />
                <button type="button" onClick={() => handleCreate(createPrompt)} disabled={generating} className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-400 disabled:opacity-60 whitespace-nowrap">
                  {generating ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Creating…</span> : "Create"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-stone-500">Aspect</label>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="rounded-lg border border-surface-600 bg-surface-800 px-2 py-1.5 text-sm text-white focus:border-brand-500 focus:outline-none">
                    {ASPECT_RATIO_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                {/* 4K toggle */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQuality4k((v) => !v)} className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${quality4k ? "bg-brand-500" : "bg-surface-500"}`}>
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${quality4k ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <span className="text-xs text-stone-400">4K {quality4k ? <span className="text-brand-400">(on)</span> : ""}</span>
                </div>

                {selectedIdeaTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedIdeaTags.map((tag) => <span key={tag} className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 text-xs text-brand-200">{tag}</span>)}
                    <button type="button" onClick={() => { setSelectedIdeaTags([]); setSelectedIdeaType(""); }} className="text-xs text-stone-500 hover:text-stone-300">✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Photo upload */}
            <div className="mb-6">
              <PhotoUploadZone
                onFile={handlePhotoFile}
                onUrl={handlePhotoUrl}
                loading={uploadLoading}
                disabled={generating}
              />
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            {/* Idea modules */}
            <section className="mb-8">
              <h3 className="mb-1 text-lg font-semibold text-white">Templates</h3>
              <p className="mb-5 text-sm text-stone-500">Click any card to load the prompt, then Create.</p>
              {IDEA_MODULES.map((section) => (
                <div key={section.category} className="mb-8">
                  <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-stone-400">{section.category}</h4>
                  {section.subtitle && <p className="mb-3 text-xs text-stone-500">{section.subtitle}</p>}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((item) => {
                      const promptText = brand?.name?.trim() ? `${brand.name}: ${item.prompt}` : item.prompt;
                      return (
                        <button
                          key={`${section.category}-${item.title}`}
                          type="button"
                          onClick={() => {
                            setSelectedIdeaTags((prev) => Array.from(new Set([...prev, item.title])).slice(0, 4));
                            setSelectedIdeaType(item.title);
                            setCreatePrompt(promptText);
                            setError(null);
                          }}
                          className="rounded-xl border border-surface-600 bg-surface-800/50 p-4 text-left transition hover:border-brand-500/50 hover:bg-surface-700/50"
                        >
                          <span className="text-xl">{item.icon}</span>
                          <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">{item.description}</p>
                          <span className="mt-3 inline-block rounded-lg bg-brand-500/20 px-2.5 py-1 text-xs font-medium text-brand-300">Use template</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            {/* Curated aesthetics */}
            <div className="mb-6 rounded-xl border border-surface-600 bg-surface-800/30 p-4">
              <p className="mb-1 text-sm font-semibold text-stone-300">Curated Aesthetics</p>
              <p className="mb-3 text-xs text-stone-500">Style presets — click to load.</p>
              <div className="flex flex-wrap gap-2">
                {CURATED_AESTHETICS.map((a) => {
                  const promptText = `${brand?.name ?? "Brand"}: ${a.prompt}`;
                  return (
                    <button key={a.id} type="button" onClick={() => { setSelectedIdeaType(""); setCreatePrompt(promptText); setError(null); }} className="rounded-lg border border-surface-500 bg-surface-700/50 px-3 py-2 text-sm text-stone-200 transition hover:border-brand-500/50 hover:bg-surface-600/50">{a.title}</button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <Link href="/" className="text-sm text-stone-500 hover:text-white">Try another URL</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─── ASSETS (empty) ───────────────────────────────────────────────────────────
  if (phase === "assets" && (!assets || assets.length === 0)) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-xl px-4 pt-32 pb-24 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">No images generated</h1>
          <p className="mb-6 text-stone-400">Generation failed or returned no assets. Check your Replicate token and credits, then try again.</p>
          <button type="button" onClick={() => setPhase("create")} className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-400">Back to Create</button>
        </div>
      </main>
    );
  }

  // ─── ASSETS phase ─────────────────────────────────────────────────────────────
  if (phase === "assets" && assets && assets.length > 0) {
    function downloadAsset(asset: GeneratedAsset, format = "png") {
      const link = document.createElement("a");
      link.href = asset.url;
      link.download = `${brand?.name?.replace(/\s+/g, "-").toLowerCase() || "brand"}-${asset.label.replace(/\s+/g, "-").toLowerCase()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    function downloadAllAssets() {
      assets!.forEach((asset, index) => setTimeout(() => downloadAsset(asset), index * 500));
    }
    const selectedAsset = assets.find((a) => a.id === selectedAssetId) ?? assets[0];

    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-5xl px-4 pt-24 pb-24">
          {demoMode && (
            <div className="mb-6 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <p className="font-medium text-amber-100">Showing placeholder images.</p>
              {replicateAttempted ? (
                <p className="mt-1">Replicate was called but returned no image. Check <a href="https://replicate.com/account/billing" target="_blank" rel="noreferrer" className="underline">billing</a> and your <code className="rounded bg-amber-500/20 px-1">REPLICATE_API_TOKEN</code>.</p>
              ) : (
                <p className="mt-1">Add <code className="rounded bg-amber-500/20 px-1">REPLICATE_API_TOKEN</code> to <code className="rounded bg-amber-500/20 px-1">.env</code> for real AI images. <Link href="/setup" className="underline hover:text-amber-100">Setup guide →</Link></p>
              )}
            </div>
          )}

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Generated assets</h1>
              <p className="text-sm text-stone-400">{brand?.name || displayUrl}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={downloadAllAssets} className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download All
              </button>
              <button type="button" onClick={() => setPhase("create")} className="rounded-xl border border-surface-500 px-5 py-2.5 font-medium text-white hover:border-surface-400">
                Create more
              </button>
            </div>
          </div>

          {/* Resize for platforms — professional grid */}
          <div className="mb-6 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
            <p className="mb-1 text-sm font-semibold text-white">↔ Resize for Platforms</p>
            <p className="mb-3 text-xs text-stone-500">Regenerate this concept at the right size for each platform — costs 1 credit each.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RESIZE_PLATFORMS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={!!resizingPlatform || generating}
                  onClick={() => handleResizeForPlatform(p.aspectRatio, p.label)}
                  className="flex flex-col items-start rounded-lg border border-surface-500 bg-surface-700/50 px-3 py-2.5 text-left transition hover:border-brand-500/50 hover:bg-surface-600/50 disabled:opacity-50"
                >
                  <span className="text-base">{p.icon}</span>
                  <span className="mt-1 text-xs font-medium text-white">{resizingPlatform === p.label ? "…" : p.label}</span>
                  <span className="text-xs text-stone-500">{p.size}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

          {/* Main editor grid */}
          <div className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Preview */}
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
              <p className="mb-3 text-sm font-semibold text-white">Preview</p>
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-700">
                <Image src={selectedAsset.url} alt={selectedAsset.label} fill unoptimized className="object-cover" />
              </div>
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-stone-500">{selectedAsset.label} · {selectedAsset.width}×{selectedAsset.height}</p>
                <div className="flex gap-2">
                  {["png", "jpg", "webp"].map((fmt) => (
                    <button key={fmt} type="button" onClick={() => downloadAsset(selectedAsset, fmt)} className="flex-1 rounded-lg bg-surface-600 py-2 text-xs font-semibold uppercase text-white hover:bg-surface-500">{fmt}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Image editor */}
            <ImageEditorPanel
              asset={selectedAsset}
              brand={brand}
              onRegenerate={(prompt, q) => { setEditorPrompt(prompt); handleCreate(prompt, q); }}
              onVariation={(q) => handleCreateVariation(q)}
              generating={generating}
            />
          </div>

          {/* Asset grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className={`group cursor-pointer overflow-hidden rounded-xl border bg-surface-800/50 transition ${selectedAsset.id === asset.id ? "border-brand-500/70 ring-1 ring-brand-500/30" : "border-surface-600 hover:border-brand-500/40"}`}
                onClick={() => { setSelectedAssetId(asset.id); setEditorPrompt(asset.prompt ?? createPrompt); }}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-surface-700">
                  <Image src={asset.url} alt={asset.label} fill unoptimized className="object-cover transition group-hover:scale-105" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/30">View Full Size ↗</a>
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-white">{asset.label}</p>
                  <p className="mb-2 text-xs text-stone-500">{asset.width}×{asset.height}</p>
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {["png", "jpg", "webp"].map((fmt) => (
                      <button key={fmt} type="button" onClick={() => downloadAsset(asset, fmt)} className="flex-1 rounded-md bg-surface-600 py-1.5 text-xs font-medium uppercase text-white hover:bg-surface-500">{fmt}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Upload more at bottom */}
          <div className="mt-8">
            <PhotoUploadZone
              onFile={handlePhotoFile}
              onUrl={handlePhotoUrl}
              loading={uploadLoading}
              disabled={generating}
            />
          </div>

          <div className="mt-8 text-center">
            <Link href="/dashboard" className="text-sm text-brand-400 hover:text-brand-300">View all assets in Dashboard →</Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>}>
      <AnalyzeContent />
    </Suspense>
  );
}
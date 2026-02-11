"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

const EXTRACTION_STEPS = [
  "Understanding the brand",
  "Mapping visual patterns",
  "Capturing the color palette",
  "Learning the aesthetics",
  "Putting everything together",
];

const IDEA_CARDS = [
  { title: "Blog Header", prompt: "Professional blog header image with clean typography", icon: "📄" },
  { title: "Social Post", prompt: "Eye-catching social media post, modern design", icon: "📱" },
  { title: "Merchandise", prompt: "Premium merchandise design, t-shirt or hoodie mockup", icon: "👕" },
  { title: "Banner Ad", prompt: "Professional banner advertisement, compelling visuals", icon: "🎯" },
  { title: "Product Shot", prompt: "Elegant product photography, studio lighting", icon: "📸" },
  { title: "Story Cover", prompt: "Instagram story cover, vertical format, engaging", icon: "📖" },
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
  personality?: string;
  tone?: string;
  brandId?: string;
};

type GeneratedAsset = {
  id: string;
  url: string;
  label: string;
  type: string;
  width: number;
  height: number;
};

type Phase = "extracting" | "generated" | "create" | "assets";

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const [phase, setPhase] = useState<Phase>("extracting");
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(36);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [createPrompt, setCreatePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("__auto__");
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<GeneratedAsset[] | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = url ? decodeURIComponent(url) : "";
  const domain = brand?.domain ?? (url ? new URL(decodeURIComponent(url)).hostname.replace(/^www\./, "") : "");

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/extract-brand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: decodeURIComponent(url) }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setBrand(data);
          setStepIndex(EXTRACTION_STEPS.length);
          setSecondsLeft(0);
          setTimeout(() => setPhase("generated"), 600);
        } else {
          setExtractError(data.error ?? "Could not analyze URL");
          setStepIndex(EXTRACTION_STEPS.length);
          setPhase("generated");
        }
      } catch (e) {
        if (!cancelled) {
          setExtractError("Could not analyze URL");
          setPhase("generated");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

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

  async function handleCreate(promptText: string) {
    if (!url || !brand) return;
    const prompt = promptText.trim() || "Professional branded image";
    setError(null);
    setGenerating(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetch("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: decodeURIComponent(url),
          brand: { name: brand.name, colors: brand.colors, description: brand.description },
          brandId: brand.brandId ?? undefined,
          limit: 2,
          promptOverride: prompt,
          aspectRatio: aspectRatio === "__auto__" ? "1:1" : aspectRatio,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setAssets(data.assets ?? []);
      setDemoMode(!!data.demo);
      setPhase("assets");
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

  if (!url) {
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
                      <img src={brand.image} alt="" className="h-12 w-12 rounded-full object-cover" />
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
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-4xl px-4 pt-24 pb-24 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Brand identity generated</h1>
          <p className="mb-10 text-stone-400">Begin creating branded images now!</p>
          <div className="mb-10 flex justify-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-brand-500/50 bg-brand-500/20">
              <span className="text-5xl font-bold text-brand-400">✓</span>
            </div>
          </div>
          {extractError && <p className="mb-6 text-sm text-amber-400">{extractError}</p>}
          <button
            type="button"
            onClick={() => setPhase("create")}
            className="rounded-xl bg-brand-500 px-8 py-4 text-lg font-semibold text-white hover:bg-brand-400"
          >
            Let&apos;s Begin
          </button>
        </div>
      </main>
    );
  }

  if (phase === "create") {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto flex max-w-6xl gap-8 px-4 pt-24 pb-24">
          <aside className="hidden w-72 shrink-0 space-y-6 lg:block">
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
              <div className="flex items-center gap-3">
                {brand?.image && !brand.image.endsWith(".mp4") ? (
                  <img src={brand.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/30 font-bold text-brand-400">{brand?.name?.slice(0, 1) ?? "?"}</div>
                )}
                <span className="font-semibold text-white">{brand?.name ?? "Brand"}</span>
              </div>
              <p className="mt-2 text-xs text-stone-500">Domain</p>
              <p className="text-sm text-stone-300">{domain}</p>
              <p className="mt-3 text-xs text-stone-500">Description</p>
              <p className="line-clamp-2 text-sm text-stone-400">{brand?.description || "—"}</p>
              {brand?.tagline && (
                <>
                  <p className="mt-3 text-xs text-stone-500">Tagline</p>
                  <p className="text-sm text-stone-300">&quot;{brand.tagline}&quot;</p>
                </>
              )}
            </div>
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Colors</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {brand?.colors?.map((c) => (
                  <span key={c} className="h-6 w-6 rounded-full border border-surface-500" style={{ backgroundColor: c }} title={c} />
                )) ?? <span className="text-sm text-stone-500">—</span>}
              </div>
            </div>
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Fonts</p>
              {brand?.fonts?.length ? (
                <p className="mt-1 text-sm text-stone-300">{brand.fonts.join(", ")}</p>
              ) : (
                <p className="mt-1 text-sm text-stone-500">—</p>
              )}
            </div>
            <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Tone</p>
              {brand?.tone ? (
                <p className="mt-1 text-sm text-stone-300">{brand.tone}</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Professional", "Modern", "Clear"].map((t) => (
                    <span key={t} className="rounded-full bg-surface-600 px-2 py-0.5 text-xs text-stone-300">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <h2 className="mb-6 text-2xl font-bold text-white">What will you create?</h2>
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
            <p className="mb-4 text-sm text-stone-500">Some ideas to get started</p>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {IDEA_CARDS.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => handleCreate(`${brand?.name ?? "Brand"}: ${card.prompt}`)}
                  disabled={generating}
                  className="rounded-xl border border-surface-600 bg-surface-800/50 p-4 text-left transition hover:border-brand-500/50 disabled:opacity-60"
                >
                  <span className="text-2xl">{card.icon}</span>
                  <p className="mt-2 font-medium text-white">{brand?.name ?? "Brand"}: {card.title}</p>
                </button>
              ))}
            </div>

            <div className="mb-6 rounded-xl border border-surface-600 bg-surface-800/30 p-4">
              <p className="mb-1 text-sm font-medium text-stone-300">Curated Aesthetics</p>
              <p className="mb-4 text-xs text-stone-500">Choose a preset to generate brand imagery in that style.</p>
              <div className="flex flex-wrap gap-2">
                {CURATED_AESTHETICS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleCreate(`${brand?.name ?? "Brand"}: ${a.prompt}`)}
                    disabled={generating}
                    className="rounded-lg border border-surface-500 bg-surface-700/50 px-3 py-2 text-sm text-stone-200 transition hover:border-brand-500/50 hover:bg-surface-600/50 disabled:opacity-60"
                  >
                    {a.title}
                  </button>
                ))}
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

  if (phase === "assets" && assets && assets.length > 0) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-4xl px-4 pt-24 pb-24">
          {demoMode && (
            <div className="mb-6 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Demo mode — add REPLICATE_API_TOKEN to .env for real AI images.
            </div>
          )}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Generated assets</h1>
              <p className="text-stone-400">{displayUrl}</p>
            </div>
            <button
              type="button"
              onClick={() => setPhase("create")}
              className="rounded-xl border border-surface-500 px-5 py-2.5 font-medium text-white hover:border-surface-400"
            >
              Create more
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {assets.map((asset) => (
              <a
                key={asset.id}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="overflow-hidden rounded-xl border border-surface-600 bg-surface-800/50 transition hover:border-brand-500/50"
              >
                <div className="aspect-video w-full bg-surface-700">
                  <img src={asset.url} alt={asset.label} className="h-full w-full object-cover" width={asset.width} height={asset.height} />
                </div>
                <div className="p-3">
                  <p className="font-medium text-white">{asset.label}</p>
                  <p className="text-xs text-stone-500">{asset.width}×{asset.height}</p>
                </div>
              </a>
            ))}
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

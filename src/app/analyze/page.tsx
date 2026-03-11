"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type BrandData = {
  id?: string;
  brandId?: string;
  name?: string;
  primaryColor?: string | null;
  colors?: string[];
  logoUrl?: string | null;
  personality?: string | null;
  tone?: string | null;
};

type AssetPlanItem = {
  assetType: string;
  platform: string;
  purpose: string;
  headlineConcept: string;
  visualDirection: string;
  cta: string;
};

type StrategicPlan = {
  campaignName: string;
  objective: string;
  strategySummary: string;
  duration: string;
  assetPlan: AssetPlanItem[];
};

type GeneratedAsset = {
  id: string;
  url: string | null;
  finalImageUrl: string | null;
  label: string;
  type: string;
  width: number;
  height: number;
  status: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS = [
  { id: "brand_awareness", label: "Brand Awareness",  icon: "📣", desc: "Build recognition and reach a new audience" },
  { id: "product_launch",  label: "Product Launch",   icon: "🚀", desc: "Introduce a new product or feature" },
  { id: "lead_generation", label: "Lead Generation",  icon: "🎯", desc: "Attract and capture qualified leads" },
  { id: "sales_campaign",  label: "Sales Campaign",   icon: "💰", desc: "Drive conversions and revenue" },
  { id: "content_series",  label: "Content Series",   icon: "📱", desc: "Ongoing social content cadence" },
  { id: "event_promotion", label: "Event Promotion",  icon: "🎪", desc: "Promote an event or live launch" },
];

const PLATFORMS = [
  "Instagram", "LinkedIn", "Twitter / X", "Facebook",
  "YouTube", "Pinterest", "Email", "Display Ads",
];

const TONES = [
  { id: "minimal_luxury",     label: "Minimal & Luxury"     },
  { id: "bold_energetic",     label: "Bold & Energetic"     },
  { id: "warm_friendly",      label: "Warm & Friendly"      },
  { id: "professional_clean", label: "Professional & Clean" },
  { id: "playful_fun",        label: "Playful & Fun"        },
  { id: "edgy_disruptive",    label: "Edgy & Disruptive"    },
];

const REFERENCE_BRANDS = [
  "Apple", "Nike", "Aesop", "Stripe", "Notion", "Airbnb", "Spotify",
  "Tesla", "Zara", "Gucci", "Patagonia", "Figma", "Linear", "Vercel",
  "Oatly", "Glossier", "Away", "Allbirds", "Warby Parker", "Loewe",
];

const STEP_LABELS = ["Brand", "Goal", "Brief", "References", "Strategy", "Approve"];

const GOAL_TO_CAMPAIGN_TYPE: Record<string, string> = {
  brand_awareness: "awareness",
  product_launch:  "launch",
  lead_generation: "growth",
  sales_campaign:  "conversion",
  content_series:  "engagement",
  event_promotion: "announcement",
};

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepProgress({ current, onCancel }: { current: WizardStep; onCancel: () => void }) {
  if (current > 6) return null;
  const display = Math.min(current, 6) as 1 | 2 | 3 | 4 | 5 | 6;
  return (
    <div className="sticky top-16 z-40 border-b border-surface-700 bg-surface-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-1">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const done   = display > num;
            const active = display === num;
            return (
              <div key={label} className="flex items-center gap-1">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  done   ? "bg-brand-500 text-white" :
                  active ? "border-2 border-brand-500 text-brand-400" :
                           "border border-surface-600 text-stone-600"
                }`}>
                  {done ? "✓" : num}
                </div>
                <span className={`hidden text-xs transition-colors sm:block ${
                  active ? "font-medium text-white" : done ? "text-brand-400" : "text-stone-600"
                }`}>{label}</span>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`mx-0.5 h-px w-4 sm:w-8 transition-colors ${done ? "bg-brand-500/50" : "bg-surface-600"}`} />
                )}
              </div>
            );
          })}
        </div>
        <button onClick={onCancel} className="text-xs text-stone-600 hover:text-stone-400 transition">Cancel</button>
      </div>
    </div>
  );
}

// ─── Wizard inner (uses useSearchParams) ──────────────────────────────────────

function WizardContent() {
  const { status } = useSession();
  const router      = useRouter();
  const searchParams = useSearchParams();

  const [step,       setStep]       = useState<WizardStep>(1);
  const [inputMode,  setInputMode]  = useState<"url" | "logo">("url");
  const [urlInput,   setUrlInput]   = useState("");
  const [logoFile,   setLogoFile]   = useState<File | null>(null);
  const [logoName,   setLogoName]   = useState("");
  const [brandId,    setBrandId]    = useState<string | null>(null);
  const [brandData,  setBrandData]  = useState<BrandData | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Step 2
  const [goal, setGoal] = useState("");

  // Step 3
  const [brief,          setBrief]          = useState("");
  const [industry,       setIndustry]       = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone,           setTone]           = useState("");
  const [platforms,      setPlatforms]      = useState<string[]>([]);

  // Step 4
  const [references, setReferences] = useState<string[]>([]);
  const [refInput,   setRefInput]   = useState("");

  // Step 5/6
  const [plan, setPlan] = useState<StrategicPlan | null>(null);

  // Step 7/8
  const [assets,      setAssets]      = useState<GeneratedAsset[]>([]);
  const [genProgress, setGenProgress] = useState(0);

  // ── Seed from query params ──────────────────────────────────────────────────
  useEffect(() => {
    const urlParam     = searchParams.get("url");
    const brandIdParam = searchParams.get("brandId");
    if (urlParam)     setUrlInput(urlParam);
    if (brandIdParam) { setBrandId(brandIdParam); setStep(2); }
  }, [searchParams]);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/analyze")}`);
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // ── Step 1 handlers ─────────────────────────────────────────────────────────
  async function handleBrandExtract() {
    setError(null);
    setLoading(true);
    try {
      if (inputMode === "url") {
        const trimmed = urlInput.trim();
        const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
        new URL(href); // validate
        const res  = await fetch("/api/extract-brand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: href }),
          credentials: "include",
        });
        const data = await res.json() as BrandData & { error?: string };
        if (!res.ok) throw new Error(data.error || "Brand extraction failed");
        const id = data.brandId ?? data.id ?? "";
        setBrandId(id);
        setBrandData(data);
      } else {
        if (!logoFile) throw new Error("Please select a logo file");
        const form = new FormData();
        form.set("logo", logoFile);
        if (logoName.trim()) form.set("brandName", logoName.trim());
        const res  = await fetch("/api/extract-brand-from-logo", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const data = await res.json() as BrandData & { error?: string };
        if (!res.ok) throw new Error(data.error || "Logo analysis failed");
        const id = data.brandId ?? data.id ?? "";
        setBrandId(id);
        setBrandData(data);
      }
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 4 → 5: Generate strategy ──────────────────────────────────────────
  async function generateStrategy() {
    setError(null);
    setStep(5);
    try {
      const campaignType = GOAL_TO_CAMPAIGN_TYPE[goal] ?? goal;
      const fullBrief = [
        brief.trim(),
        industry       ? `Industry: ${industry}`               : "",
        targetAudience ? `Target audience: ${targetAudience}`  : "",
        tone           ? `Tone: ${TONES.find(t => t.id === tone)?.label ?? tone}` : "",
        platforms.length ? `Platforms: ${platforms.join(", ")}` : "",
        references.length ? `Reference brands / inspirations: ${references.join(", ")}` : "",
      ].filter(Boolean).join("\n");

      const res  = await fetch("/api/campaign/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          goal,
          campaignType,
          brief: fullBrief,
          platforms,
          references,
          type: "advanced",
          platform: platforms,
          timeline: "2 weeks",
          budget: "flexible",
          description: fullBrief,
        }),
        credentials: "include",
      });
      const data = await res.json() as { plan?: StrategicPlan; error?: string } & StrategicPlan;
      if (!res.ok) throw new Error(data.error || "Strategy generation failed");
      setPlan(data.plan ?? data);
      setStep(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Strategy generation failed");
      setStep(4);
    }
  }

  // ── Step 6 → 7: Generate assets ────────────────────────────────────────────
  async function generateAssets() {
    setStep(7);
    setGenProgress(0);
    setError(null);

    const tick = setInterval(() => {
      setGenProgress(p => Math.min(p + Math.random() * 6 + 1, 88));
    }, 900);

    try {
      const res  = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, goal, brief, platforms, plan }),
        credentials: "include",
      });
      clearInterval(tick);
      const data = await res.json() as { assets?: GeneratedAsset[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGenProgress(100);
      setAssets(data.assets ?? []);
      setStep(8);
    } catch (e) {
      clearInterval(tick);
      setError(e instanceof Error ? e.message : "Generation failed");
      setStep(6);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  function addReference(val: string) {
    const t = val.trim();
    if (t && !references.includes(t)) setReferences(prev => [...prev, t]);
    setRefInput("");
  }

  function resetWizard() {
    setStep(1); setBrandId(null); setBrandData(null);
    setGoal(""); setBrief(""); setIndustry(""); setTargetAudience("");
    setTone(""); setPlatforms([]); setReferences([]); setPlan(null); setAssets([]);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-900 pt-16">
      <StepProgress current={step} onCancel={() => router.push("/dashboard")} />

      <div className="mx-auto max-w-3xl px-4 py-12">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 1 — Brand Input                                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-400">Step 1 of 6</p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">Start with your brand</h1>
              <p className="mt-3 text-stone-400">Enter your website or upload a logo. We extract colors, fonts, tone, and identity.</p>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="flex rounded-xl bg-surface-800 p-1 border border-surface-700">
                {(["url", "logo"] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => setInputMode(mode)}
                    className={`rounded-lg px-6 py-2.5 text-sm font-medium transition ${inputMode === mode ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>
                    {mode === "url" ? "🌐 Website URL" : "🖼 Upload Logo"}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-surface-600 bg-surface-800 p-8">
              {inputMode === "url" ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-stone-300">Website URL</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleBrandExtract()}
                    placeholder="https://your-brand.com"
                    className="w-full rounded-xl border border-surface-600 bg-surface-700 px-4 py-3.5 text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <p className="text-xs text-stone-600">We scan colors, fonts, logos, and brand tone from your site automatically.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-stone-300">Brand Name (optional)</label>
                    <input
                      type="text"
                      value={logoName}
                      onChange={e => setLogoName(e.target.value)}
                      placeholder="e.g. Acme Inc."
                      className="w-full rounded-xl border border-surface-600 bg-surface-700 px-4 py-3.5 text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-stone-300">Logo File</label>
                    <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition ${
                      logoFile ? "border-brand-500/50 bg-brand-500/5" : "border-surface-600 hover:border-surface-500 hover:bg-surface-700/50"
                    }`}>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                        onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
                      <span className="text-3xl">{logoFile ? "✅" : "📁"}</span>
                      <span className="text-sm text-stone-400">{logoFile ? logoFile.name : "Click to upload PNG, JPEG, WebP, SVG"}</span>
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
              )}

              <button
                type="button"
                onClick={handleBrandExtract}
                disabled={loading || (inputMode === "url" ? !urlInput.trim() : !logoFile)}
                className="mt-6 w-full rounded-xl bg-brand-500 py-4 font-semibold text-white transition hover:bg-brand-400 disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Extracting brand…
                  </span>
                ) : "Extract Brand Identity →"}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 2 — Goal Selection                                            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-400">Step 2 of 6</p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">What do you want to achieve?</h1>
              <p className="mt-3 text-stone-400">Choose the primary goal. This shapes the entire campaign strategy.</p>
            </div>

            {brandData?.name && (
              <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-surface-600 bg-surface-800 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                <span className="text-sm text-stone-400">Brand: <span className="font-medium text-white">{brandData.name}</span></span>
                {brandData.primaryColor && (
                  <span className="ml-auto h-5 w-5 rounded-full border border-surface-600" style={{ background: brandData.primaryColor }} />
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className={`group rounded-2xl border p-6 text-left transition-all ${
                    goal === g.id
                      ? "border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20"
                      : "border-surface-600 bg-surface-800 hover:border-surface-500 hover:bg-surface-700"
                  }`}
                >
                  <span className="mb-3 block text-3xl">{g.icon}</span>
                  <p className={`font-semibold ${goal === g.id ? "text-white" : "text-stone-200"}`}>{g.label}</p>
                  <p className="mt-1 text-sm text-stone-500">{g.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-surface-600 px-6 py-3 text-sm text-stone-400 transition hover:text-white">← Back</button>
              <button type="button" onClick={() => setStep(3)} disabled={!goal}
                className="flex-1 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-400 disabled:opacity-40">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 3 — Brief                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-400">Step 3 of 6</p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">Write your brief</h1>
              <p className="mt-3 text-stone-400">The more context you give, the sharper the AI output. Think like a consultant briefing their creative team.</p>
            </div>

            <div className="space-y-5 rounded-2xl border border-surface-600 bg-surface-800 p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-300">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g. Premium skincare, B2B SaaS, Fashion"
                    className="w-full rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-300">Target Audience</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    placeholder="e.g. Women 25–40, CTOs at startups"
                    className="w-full rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-300">Brand Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t.id} type="button" onClick={() => setTone(tone === t.id ? "" : t.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        tone === t.id ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-300">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        platforms.includes(p) ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 flex items-center justify-between text-sm font-medium text-stone-300">
                  <span>Campaign Brief</span>
                  <span className="text-xs text-stone-600">{brief.length} / 800</span>
                </label>
                <textarea
                  value={brief}
                  onChange={e => setBrief(e.target.value.slice(0, 800))}
                  rows={6}
                  placeholder={`Describe your campaign in detail. Example:\n\nWe are launching a premium skincare brand targeting women 25–40.\nGoal: build trust and drive online sales.\nKey message: science-backed formulas, clean ingredients.\nTone: minimal, luxury, confident.\nWe want to feel like Aesop meets Glossier.`}
                  className="w-full resize-none rounded-xl border border-surface-600 bg-surface-700 px-4 py-3.5 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none leading-relaxed"
                />
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-brand-500/5 border border-brand-500/15 px-3 py-2">
                  <span className="text-xs">💡</span>
                  <p className="text-xs text-stone-500">The more detail you provide, the better the AI output. Don't skip this step — it's what separates professional results from generic ones.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-surface-600 px-6 py-3 text-sm text-stone-400 transition hover:text-white">← Back</button>
              <button type="button" onClick={() => setStep(4)}
                className="flex-1 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-400">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 4 — References                                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div>
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-400">Step 4 of 6</p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">Add inspiration</h1>
              <p className="mt-3 text-stone-400">Which brands or styles inspire your visual direction? This guides the AI's aesthetic choices.</p>
            </div>

            <div className="rounded-2xl border border-surface-600 bg-surface-800 p-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Quick picks</p>
              <div className="mb-6 flex flex-wrap gap-2">
                {REFERENCE_BRANDS.map(brand => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => references.includes(brand) ? setReferences(prev => prev.filter(r => r !== brand)) : addReference(brand)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      references.includes(brand) ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"
                    }`}
                  >
                    {references.includes(brand) ? "✓ " : ""}{brand}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Or add your own</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refInput}
                  onChange={e => setRefInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addReference(refInput); }}}
                  placeholder="Type a brand name and press Enter"
                  className="flex-1 rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
                />
                <button type="button" onClick={() => addReference(refInput)}
                  className="rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-stone-400 hover:text-white transition">
                  Add
                </button>
              </div>

              {references.length > 0 && (
                <div className="mt-5 rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
                  <p className="mb-2.5 text-xs text-stone-500">Your references ({references.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {references.map(r => (
                      <span key={r} className="flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs text-brand-300">
                        {r}
                        <button type="button" onClick={() => setReferences(prev => prev.filter(x => x !== r))}
                          className="text-brand-400/60 hover:text-brand-300 transition leading-none">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-center text-xs text-stone-600">References are optional but significantly improve visual direction.</p>

            {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setStep(3)} className="rounded-xl border border-surface-600 px-6 py-3 text-sm text-stone-400 transition hover:text-white">← Back</button>
              <button type="button" onClick={generateStrategy}
                className="flex-1 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-400">
                Generate Strategy →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 5 — Generating Strategy (loading)                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-8">
              <div className="h-20 w-20 rounded-2xl border border-brand-500/30 bg-brand-500/10 flex items-center justify-center text-4xl animate-pulse">
                🧠
              </div>
              <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-brand-500 animate-ping" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Building your strategy…</h2>
            <p className="text-stone-400 max-w-sm leading-relaxed">
              Our AI CMO is analyzing your brand and brief to create a targeted, purposeful campaign plan.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["Analyzing brand", "Defining audience", "Planning assets", "Writing strategy"].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-2 rounded-xl border border-surface-600 bg-surface-800 px-4 py-3">
                  <div className="h-1.5 w-full rounded-full bg-surface-700 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: `${i * 200}ms`, width: "100%" }} />
                  </div>
                  <span className="text-[10px] text-stone-600">{label}</span>
                </div>
              ))}
            </div>
            {error && (
              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-400">
                {error} —{" "}
                <button type="button" onClick={() => setStep(4)} className="underline">Go back</button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 6 — Approve Strategy                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 6 && plan && (
          <div>
            <div className="mb-8 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-400">Step 6 of 6 — Review &amp; Approve</p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">Your campaign strategy</h1>
              <p className="mt-3 text-stone-400">Review the AI-generated plan before generating assets. You're in control.</p>
            </div>

            <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/5 to-transparent p-8 mb-5">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded-md bg-brand-500/20 px-2 py-0.5 text-xs font-semibold text-brand-400 uppercase tracking-wide">
                      {GOALS.find(g => g.id === goal)?.label ?? goal}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{plan.campaignName}</h2>
                  <p className="mt-1 text-sm text-stone-400">{plan.objective}</p>
                </div>
                <div className="shrink-0 rounded-xl border border-surface-600 bg-surface-800 px-4 py-2.5 text-center">
                  <p className="text-[10px] text-stone-600 uppercase tracking-wider">Duration</p>
                  <p className="text-sm font-semibold text-white">{plan.duration}</p>
                </div>
              </div>

              {/* Strategy summary */}
              <div className="mb-5 rounded-xl border border-surface-600 bg-surface-800/70 p-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">Strategic Approach</p>
                <p className="text-sm text-stone-300 leading-relaxed">{plan.strategySummary}</p>
              </div>

              {/* Asset plan */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Asset Plan — {plan.assetPlan?.length ?? 0} assets
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {(plan.assetPlan ?? []).map((item, i) => (
                    <div key={i} className="rounded-xl border border-surface-600 bg-surface-800 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white capitalize">
                          {item.assetType?.replace(/_/g, " ")}
                        </p>
                        <span className="shrink-0 rounded-md border border-surface-500 bg-surface-700 px-2 py-0.5 text-[10px] text-stone-500">
                          {item.platform}
                        </span>
                      </div>
                      <p className="mb-2 text-xs text-stone-500">{item.purpose}</p>
                      <p className="text-xs font-medium text-brand-400">"{item.headlineConcept}"</p>
                      {item.cta && (
                        <p className="mt-1 text-xs text-stone-600">CTA: {item.cta}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            {brandId && (
              <div className="mb-3 flex justify-end">
                <a
                  href={`/api/brand-kit-pdf?brandId=${brandId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-surface-600 px-3 py-2 text-xs text-stone-400 transition hover:border-surface-500 hover:text-white"
                >
                  ⬇ Download Brand Kit PDF
                </a>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)}
                className="rounded-xl border border-surface-600 px-6 py-3 text-sm text-stone-400 transition hover:text-white">
                ← Edit Brief
              </button>
              <button type="button" onClick={generateAssets}
                className="flex-1 rounded-xl bg-brand-500 py-3.5 font-bold text-white transition hover:bg-brand-400">
                ✅ Approve &amp; Generate Campaign
              </button>
            </div>
          </div>
        )}

        {/* Fallback: step 6 without plan */}
        {step === 6 && !plan && (
          <div className="text-center py-20">
            <p className="text-stone-400">No strategy generated yet.</p>
            <button type="button" onClick={() => setStep(4)} className="mt-4 text-brand-400 underline text-sm">← Go back</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 7 — Generating Assets (loading)                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 7 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-8 text-5xl">🎨</div>
            <h2 className="text-2xl font-bold text-white mb-3">Generating your campaign…</h2>
            <p className="text-stone-400 mb-8 max-w-sm">Creating on-brand assets following your approved strategy. Each asset is designed to your brief.</p>
            <div className="w-full max-w-sm">
              <div className="mb-2 flex justify-between text-xs text-stone-600">
                <span>Generating assets</span>
                <span>{Math.round(genProgress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-700">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-700"
                  style={{ width: `${genProgress}%` }}
                />
              </div>
            </div>
            {error && (
              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-400">
                {error} —{" "}
                <button type="button" onClick={() => setStep(6)} className="underline">Go back</button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 8 — Results                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 8 && (
          <div>
            <div className="mb-8 text-center">
              <div className="mb-4 text-4xl">🎉</div>
              <h1 className="text-3xl font-bold text-white">Campaign ready!</h1>
              <p className="mt-2 text-stone-400">Your on-brand assets are generated. Download or head to your dashboard.</p>
            </div>

            {assets.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assets.map(asset => {
                  const imgUrl = asset.finalImageUrl ?? asset.url ?? "";
                  return (
                    <div key={asset.id} className="group overflow-hidden rounded-2xl border border-surface-600 bg-surface-800">
                      <div className="relative aspect-square overflow-hidden bg-surface-700">
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl} alt={asset.label}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-stone-600 text-sm">
                            <span className="animate-pulse">Finalizing…</span>
                          </div>
                        )}
                        {imgUrl && (
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/65 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                            <a href={imgUrl} download={`${asset.label}.png`} target="_blank" rel="noopener noreferrer"
                              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-stone-100 transition">
                              ⬇ Download
                            </a>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] text-stone-400 backdrop-blur">
                          {asset.width}×{asset.height}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs font-semibold text-white">{asset.label}</p>
                        <p className="text-[10px] capitalize text-stone-600">{asset.type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-surface-600 bg-surface-800 p-12 text-center">
                <p className="text-stone-400">
                  Assets are being finalized. Check your{" "}
                  <Link href="/dashboard" className="text-brand-400 hover:text-brand-300 transition">dashboard</Link>{" "}
                  shortly.
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard"
                className="rounded-xl border border-surface-600 px-6 py-3 text-sm text-stone-400 transition hover:text-white">
                View all in Dashboard
              </Link>
              <button type="button" onClick={resetWizard}
                className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400">
                New Campaign →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Page export (with Suspense for useSearchParams) ─────────────────────────

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    }>
      <WizardContent />
    </Suspense>
  );
}
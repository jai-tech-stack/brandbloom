"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type ExistingBrand = { id: string; name: string; domain: string };
type Tab = "url" | "logo";

function normalizeDomain(raw: string): string {
  try {
    const withProto = raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`;
    const hostname = new URL(withProto).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return raw.trim().toLowerCase().replace(/^www\./, "").split("/")[0];
  }
}

// ── Extraction steps shown in the progress panel ──────────────────────────────
const STEPS = [
  { key: "scraping",  label: "Reading website",         detail: "Fetching pages, assets & metadata" },
  { key: "analyzing", label: "Extracting brand identity",detail: "Colors, fonts, tone, archetype"    },
  { key: "done",      label: "Building brand DNA",       detail: "Structuring your brand system"     },
] as const;

// ── Static Brand DNA preview shown in the right panel ─────────────────────────
function BrandDNAPreview() {
  return (
    <div className="rounded-2xl border border-surface-600 bg-surface-800 p-5 shadow-card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Brand DNA Preview</span>
        <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">AI-generated</span>
      </div>

      {/* Color palette */}
      <div>
        <p className="mb-2 text-xs font-medium text-stone-500">Color palette</p>
        <div className="flex gap-2">
          {["#1a1a2e","#e94560","#0f3460","#533483","#f5a623"].map((c) => (
            <div key={c} className="group relative">
              <div className="h-8 w-8 rounded-lg ring-1 ring-white/10" style={{ background: c }} />
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-surface-700 px-1.5 py-0.5 text-[10px] text-stone-300 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-surface-700 bg-surface-900 px-3 py-2.5">
          <p className="text-[10px] text-stone-600 uppercase tracking-wider mb-1">Heading</p>
          <p className="font-display italic text-sm text-white">Playfair Display</p>
        </div>
        <div className="rounded-xl border border-surface-700 bg-surface-900 px-3 py-2.5">
          <p className="text-[10px] text-stone-600 uppercase tracking-wider mb-1">Body</p>
          <p className="text-sm text-white font-sans">Inter Regular</p>
        </div>
      </div>

      {/* Archetype + Tone */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Archetype", value: "The Creator", icon: "✦" },
          { label: "Tone",      value: "Bold · Innovative", icon: "◈" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl border border-surface-700 bg-surface-900 px-3 py-2.5">
            <p className="text-[10px] text-stone-600 uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-brand-400 text-xs">{icon}</span>
              <p className="text-xs font-semibold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Personality traits */}
      <div>
        <p className="mb-2 text-[10px] text-stone-600 uppercase tracking-wider">Personality</p>
        <div className="flex flex-wrap gap-1.5">
          {["Innovative","Trustworthy","Bold","Approachable"].map((t) => (
            <span key={t} className="rounded-full border border-surface-600 bg-surface-700 px-2.5 py-0.5 text-xs text-stone-300">{t}</span>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-stone-600 text-center pt-1">← Your real brand data will appear here</p>
    </div>
  );
}

// ── Loading progress panel ─────────────────────────────────────────────────────
function ExtractionProgress({ step }: { step: "scraping" | "analyzing" | "done" | "idle" }) {
  const stepIndex = step === "idle" ? -1 : STEPS.findIndex((s) => s.key === step);

  return (
    <div className="rounded-2xl border border-surface-600 bg-surface-800 p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Extraction in progress</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-xs text-brand-400">Live</span>
        </span>
      </div>

      <div className="space-y-3">
        {STEPS.map((s, i) => {
          const done    = i < stepIndex || step === "done";
          const active  = i === stepIndex && step !== "done";
          return (
            <div key={s.key} className={`flex items-start gap-3 transition-opacity duration-500 ${i > stepIndex && step !== "done" ? "opacity-30" : "opacity-100"}`}>
              {/* Icon */}
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                done   ? "bg-brand-500 text-white"  :
                active ? "border-2 border-brand-500 bg-transparent" :
                         "border border-surface-600 bg-surface-900"
              }`}>
                {done ? (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : active ? (
                  <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                ) : null}
              </div>
              {/* Text */}
              <div>
                <p className={`text-sm font-medium ${active ? "text-white" : done ? "text-stone-300" : "text-stone-600"}`}>{s.label}</p>
                {active && <p className="text-xs text-stone-500 mt-0.5">{s.detail}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-700">
        <div className={`h-full rounded-full bg-brand-500 transition-all duration-700 ease-out ${
          step === "scraping"  ? "w-[35%]" :
          step === "analyzing" ? "w-[70%]" :
          step === "done"      ? "w-full"  : "w-0"
        }`} />
      </div>
    </div>
  );
}

// ── Main page content ──────────────────────────────────────────────────────────
function AnalyzeContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const paramUrl     = searchParams?.get("url") ?? "";

  const [tab, setTab] = useState<Tab>("url");
  const [existingBrands, setExistingBrands] = useState<ExistingBrand[]>([]);

  // URL form
  const [url,           setUrl]           = useState(paramUrl.replace(/^https?:\/\//, ""));
  const [urlLoading,    setUrlLoading]    = useState(false);
  const [urlError,      setUrlError]      = useState("");
  const [urlStep,       setUrlStep]       = useState<"idle" | "scraping" | "analyzing" | "done">("idle");
  const [duplicateBrand,setDuplicateBrand]= useState<ExistingBrand | null>(null);
  const autoSubmittedRef = useRef(false);

  // Logo form
  const [logoFile,    setLogoFile]    = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandName,   setBrandName]   = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError,   setLogoError]   = useState("");
  const [dragOver,    setDragOver]    = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = urlLoading || logoLoading;
  const activeStep = urlLoading ? urlStep : "idle";

  // Load existing brands
  useEffect(() => {
    fetch("/api/brands", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { brands: [] })
      .then((d: { brands?: ExistingBrand[] }) => setExistingBrands(d.brands ?? []))
      .catch(() => {});
  }, []);

  // Duplicate detection
  useEffect(() => {
    if (!url.trim()) { setDuplicateBrand(null); return; }
    const domain = normalizeDomain(url);
    if (!domain || domain.length < 3) { setDuplicateBrand(null); return; }
    const match = existingBrands.find((b) => normalizeDomain(b.domain) === domain);
    setDuplicateBrand(match ?? null);
  }, [url, existingBrands]);

  // Auto-submit from ?url=
  useEffect(() => {
    if (paramUrl && url && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      const t = setTimeout(() => {
        handleUrlSubmit(new Event("submit") as unknown as React.FormEvent);
      }, 400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || duplicateBrand) return;
    setUrlError("");
    setUrlLoading(true);
    setUrlStep("scraping");

    try {
      const withProto = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      const analyzeTimer = setTimeout(() => setUrlStep("analyzing"), 3500);

      const res = await fetch("/api/brands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "url", url: withProto }),
        credentials: "include",
      });

      clearTimeout(analyzeTimer);
      const data = await res.json().catch(() => ({})) as {
        success?: boolean;
        data?: { brandId?: string; brand?: { id?: string; name?: string; domain?: string } };
        error?: string;
      };

      if (res.status === 409) {
        const existing: ExistingBrand = {
          id: data.data?.brand?.id ?? data.data?.brandId ?? "",
          name: data.data?.brand?.name ?? "this brand",
          domain: data.data?.brand?.domain ?? normalizeDomain(trimmed),
        };
        setDuplicateBrand(existing);
        setUrlLoading(false);
        setUrlStep("idle");
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Couldn't extract brand. Check the URL and try again.");
      }

      const brandId = data.data?.brand?.id ?? data.data?.brandId;
      setUrlStep("done");
      setTimeout(() => router.push(brandId ? `/dashboard?brandId=${brandId}&new=1` : "/dashboard"), 600);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Something went wrong.");
      setUrlStep("idle");
      setUrlLoading(false);
    }
  }

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  async function handleLogoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logoFile) return;
    setLogoError("");
    setLogoLoading(true);
    try {
      const bytes = new Uint8Array(await logoFile.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const base64 = btoa(binary);
      const res = await fetch("/api/brands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "logo", logoBase64: base64, logoMimeType: logoFile.type || "image/png", brandName: brandName.trim() || "My Brand" }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({})) as {
        success?: boolean;
        data?: { brandId?: string; brand?: { id?: string } };
        error?: string;
      };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to analyze logo. Try again.");
      const brandId = data.data?.brand?.id ?? data.data?.brandId;
      router.push(brandId ? `/dashboard?brandId=${brandId}&new=1` : "/dashboard");
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Something went wrong.");
      setLogoLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-900">
      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.05] px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">B</div>
          <span className="text-sm font-bold text-white">BrandBloom</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-stone-500 hover:text-white transition">Dashboard</Link>
          <Link href="/login" className="text-xs text-stone-500 hover:text-white transition">Sign in</Link>
        </div>
      </nav>

      {/* ── Main split layout ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:flex-row">

        {/* ── LEFT: Form ──────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10 lg:max-w-xl xl:max-w-2xl">
          <div className="w-full max-w-md">

            {/* Eyebrow */}
            <div className="mb-2 flex items-center gap-2">
              <span className="h-px flex-1 bg-surface-700" />
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-600">Step 1 of 1</span>
              <span className="h-px flex-1 bg-surface-700" />
            </div>

            {/* Headline */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold leading-tight text-white">
                Add your{" "}
                <em className="font-display italic text-brand-400">brand</em>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                Paste your website URL and our AI will extract your full brand
                identity — colors, fonts, voice, archetype, and more.
              </p>
            </div>

            {/* ── Tab switcher ─────────────────────────────────────────── */}
            <div className="mb-6 flex gap-1 rounded-xl border border-surface-700 bg-surface-800 p-1">
              {(["url", "logo"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                    tab === t
                      ? "bg-surface-700 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {t === "url" ? "Website URL" : "Upload Logo"}
                </button>
              ))}
            </div>

            {/* ── URL form ─────────────────────────────────────────────── */}
            {tab === "url" && (
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                {/* Input */}
                <div className={`flex overflow-hidden rounded-xl border bg-surface-800 transition-all focus-within:border-brand-500/70 focus-within:ring-2 focus-within:ring-brand-500/20 ${
                  duplicateBrand ? "border-amber-500/50" : "border-surface-700"
                }`}>
                  <span className="flex items-center pl-4 text-sm text-stone-600 select-none">https://</span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                    placeholder="yourbrand.com"
                    disabled={urlLoading}
                    autoFocus={!paramUrl}
                    className="flex-1 bg-transparent px-2 py-3.5 text-sm text-white placeholder:text-stone-600 focus:outline-none disabled:opacity-50"
                  />
                  {url && !urlLoading && (
                    <button type="button" onClick={() => { setUrl(""); setUrlError(""); setDuplicateBrand(null); }}
                      className="flex items-center pr-4 text-stone-600 hover:text-stone-400 transition">
                      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Duplicate warning */}
                {duplicateBrand && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
                    <span className="mt-0.5 text-amber-400 shrink-0">⚠</span>
                    <div>
                      <p className="text-sm font-medium text-amber-300">
                        &ldquo;{duplicateBrand.name}&rdquo; is already in your workspace
                      </p>
                      <Link
                        href={duplicateBrand.id ? `/dashboard?brandId=${duplicateBrand.id}` : "/dashboard"}
                        className="mt-1.5 inline-block text-xs font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300"
                      >
                        Open in dashboard →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Error */}
                {urlError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3">
                    <span className="mt-0.5 text-red-400 shrink-0">✕</span>
                    <p className="text-sm text-red-400">{urlError}</p>
                  </div>
                )}

                {/* CTA */}
                <button
                  type="submit"
                  disabled={urlLoading || !!duplicateBrand || !url.trim()}
                  className="group relative w-full overflow-hidden rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                >
                  <span className={`transition-opacity ${urlLoading ? "opacity-0" : "opacity-100"}`}>
                    Extract Brand Identity →
                  </span>
                  {urlLoading && (
                    <span className="absolute inset-0 flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      <span>Analyzing…</span>
                    </span>
                  )}
                </button>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  {["Free to start","No card needed","~10 sec"].map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs text-stone-600">
                      <span className="text-brand-500/60">✓</span> {t}
                    </span>
                  ))}
                </div>
              </form>
            )}

            {/* ── Logo form ─────────────────────────────────────────────── */}
            {tab === "logo" && (
              <form onSubmit={handleLogoSubmit} className="space-y-4">
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Brand name (optional)"
                  className="w-full rounded-xl border border-surface-700 bg-surface-800 px-4 py-3 text-sm text-white placeholder:text-stone-600 transition focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-all duration-200 ${
                    dragOver
                      ? "border-brand-500 bg-brand-500/10 scale-[1.01]"
                      : logoPreview
                      ? "border-brand-500/30 bg-surface-800/60"
                      : "border-surface-700 bg-surface-800/50 hover:border-surface-600 hover:bg-surface-800"
                  }`}
                >
                  {logoPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-xl object-contain" />
                      <p className="text-xs text-stone-500">{logoFile?.name}</p>
                      <p className="text-xs text-brand-400 underline underline-offset-2">Change file</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-surface-600 bg-surface-700 group-hover:border-brand-500/40 transition">
                        <svg className="h-5 w-5 text-stone-500" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-stone-400">Drop your logo or <span className="text-brand-400">browse</span></p>
                        <p className="mt-0.5 text-xs text-stone-600">PNG, JPG, SVG · up to 10 MB</p>
                      </div>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>

                {logoError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3">
                    <span className="mt-0.5 text-red-400 shrink-0">✕</span>
                    <p className="text-sm text-red-400">{logoError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={logoLoading || !logoFile}
                  className="group relative w-full overflow-hidden rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                >
                  <span className={`transition-opacity ${logoLoading ? "opacity-0" : "opacity-100"}`}>
                    Analyze Logo →
                  </span>
                  {logoLoading && (
                    <span className="absolute inset-0 flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      <span>Analyzing…</span>
                    </span>
                  )}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-stone-600">
              Already have a brand?{" "}
              <Link href="/dashboard" className="text-stone-400 underline underline-offset-2 hover:text-white transition">
                Go to dashboard
              </Link>
            </p>
          </div>
        </div>

        {/* ── RIGHT: Preview panel (desktop only) ──────────────────────────── */}
        <div className="hidden lg:flex lg:flex-1 items-center justify-center border-l border-white/[0.04] bg-surface-800/30 px-10 py-12">
          <div className="w-full max-w-sm space-y-4">

            {/* Panel header */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                What you&rsquo;ll{" "}
                <em className="font-display italic text-brand-400">get</em>
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                A complete brand system extracted from your website in seconds.
              </p>
            </div>

            {/* Show extraction steps while loading, preview otherwise */}
            {isLoading && activeStep !== "idle" ? (
              <ExtractionProgress step={activeStep} />
            ) : (
              <BrandDNAPreview />
            )}

            {/* Feature bullets */}
            <div className="space-y-2 pt-2">
              {[
                ["✦", "Color palette", "Primary, secondary + semantic roles"],
                ["◈", "Typography",    "Heading + body fonts with scale"],
                ["◉", "Brand voice",   "Tone, archetype & personality traits"],
                ["◇", "Strategy",      "Positioning, audience & differentiators"],
                ["▸", "Asset ready",   "Generate social, ads, decks instantly"],
              ].map(([icon, title, sub]) => (
                <div key={title} className="flex items-start gap-3 rounded-xl border border-surface-700/50 bg-surface-800/40 px-4 py-3">
                  <span className="mt-0.5 text-xs text-brand-400 shrink-0">{icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-stone-300">{title}</p>
                    <p className="text-xs text-stone-600">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-xs text-stone-600">Loading…</p>
        </div>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}

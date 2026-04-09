"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

// ─── Gallery ──────────────────────────────────────────────────────────────────
const GALLERY = [
  { label: "Instagram Story", brand: "Aethera Skin", tag: "Skincare", bg: "#0d0715", primary: "#c084fc", secondary: "#7c3aed" },
  { label: "Facebook Ad",     brand: "Volta Coffee",  tag: "Coffee",   bg: "#130a02", primary: "#f97316", secondary: "#92400e" },
  { label: "LinkedIn Banner", brand: "Lune Studio",   tag: "Architecture", bg: "#050c18", primary: "#60a5fa", secondary: "#1d4ed8" },
  { label: "Product Shot",    brand: "Apex Capital",  tag: "Finance",  bg: "#030d09", primary: "#34d399", secondary: "#065f46" },
  { label: "Email Header",    brand: "Celeste",       tag: "Fashion",  bg: "#160408", primary: "#f472b6", secondary: "#9d174d" },
  { label: "YouTube Thumb",   brand: "Forge & Co.",   tag: "Hardware", bg: "#0a0a0a", primary: "#fbbf24", secondary: "#92400e" },
];

function GalleryCard({ item, i }: { item: typeof GALLERY[0]; i: number }) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover"
      style={{ background: item.bg }}
    >
      <div className="relative aspect-square overflow-hidden">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse at ${i % 2 === 0 ? "28% 32%" : "72% 68%"}, ${item.primary}22 0%, transparent 62%)` }} />

        <div className="absolute inset-0 flex flex-col justify-between p-5">
          {/* Top bar */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white"
              style={{ background: item.primary }}>
              {item.brand.slice(0, 1)}
            </div>
            <div className="h-1.5 w-12 rounded-full bg-white/20" />
            <div className="ml-auto flex gap-1">
              <div className="h-1.5 w-5 rounded-full bg-white/10" />
              <div className="h-1.5 w-5 rounded-full bg-white/10" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px w-8 rounded-full" style={{ background: item.primary }} />
              <div className="h-1.5 w-14 rounded-full" style={{ background: item.primary, opacity: 0.55 }} />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 rounded-md bg-white/88" style={{ width: `${68 + (i % 3) * 8}%` }} />
              <div className="h-3.5 rounded-md bg-white/60" style={{ width: `${48 + (i % 2) * 10}%` }} />
            </div>
            <div className="space-y-1">
              <div className="h-2 rounded bg-white/22" style={{ width: `${80 + (i % 2) * 8}%` }} />
              <div className="h-2 rounded bg-white/16" style={{ width: `${65 + (i % 3) * 6}%` }} />
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex h-7 items-center rounded-lg px-3" style={{ background: item.primary }}>
                <div className="h-1.5 w-10 rounded-full bg-white/90" />
              </div>
              <div className="flex h-7 items-center justify-center rounded-lg border border-white/12 px-3">
                <div className="h-1.5 w-7 rounded-full bg-white/30" />
              </div>
            </div>
          </div>

          {/* Palette */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[item.primary, item.secondary, "#ffffff18", "#ffffff10", "#ffffff08"].map((c, j) => (
                <div key={j} className="h-2.5 w-5 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <div className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold text-white/60"
              style={{ background: `${item.primary}20` }}>
              {item.label}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            AI-generated
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.04] px-4 py-3">
        <p className="text-xs font-semibold text-white">{item.brand}</p>
        <p className="text-[11px] text-stone-600">{item.tag}</p>
      </div>
    </div>
  );
}

// ─── URL Form ─────────────────────────────────────────────────────────────────
function UrlForm({ size = "lg" }: { size?: "lg" | "md" }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // Prevent double submit
    const v = url.trim();
    if (!v) { ref.current?.focus(); return; }
    setLoading(true);
    const finalUrl = v.startsWith("http") ? v : `https://${v}`;
    // Small delay to prevent double submissions
    setTimeout(() => {
      router.push(`/analyze?url=${encodeURIComponent(finalUrl)}`);
    }, 100);
  }

  const h = size === "lg" ? "h-14" : "h-12";
  const px = size === "lg" ? "px-8" : "px-6";
  const text = size === "lg" ? "text-base" : "text-sm";

  return (
    <form onSubmit={submit} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          </svg>
        </span>
        <input
          ref={ref}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourbrand.com"
          className={`${h} ${text} w-full rounded-2xl border border-surface-600 bg-surface-800/90 pl-11 pr-4 text-white placeholder:text-stone-600 shadow-card focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all`}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`${h} ${px} ${text} shrink-0 rounded-2xl bg-brand-500 font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-400 hover:shadow-brand-500/40 active:scale-[0.98] disabled:opacity-60`}
      >
        {loading
          ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Analyzing…</span>
          : "Analyze Brand →"}
      </button>
    </form>
  );
}

// ─── Testimonials data ────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "BrandBloom extracted our brand perfectly on the first pass — colors, fonts, tone, personality, everything. Our design agency was quoting $3,000 for the same analysis.",
    name: "Sarah M.",
    role: "Founder, Aethera Skincare",
    initial: "S",
    color: "#c084fc",
  },
  {
    quote: "Generated 12 campaign assets and got a 9.1/10 consistency score. It's the most accurate AI brand tool I've used. Nothing else comes close.",
    name: "James T.",
    role: "Head of Marketing, Apex Capital",
    initial: "J",
    color: "#34d399",
  },
  {
    quote: "Fastest way I've found to go from 'we have a URL' to 'we have a brand kit'. Used it to onboard 4 clients last month. Saves me hours every week.",
    name: "Priya K.",
    role: "Independent Brand Designer",
    initial: "P",
    color: "#f472b6",
  },
];

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { n: "01", title: "Add your website or logo", body: "Paste your URL and BrandBloom reads CSS variables, fonts, colors, JSON-LD schema, and tone in seconds. No website? Upload your logo instead." },
  { n: "02", title: "Review your Brand DNA", body: "Every extracted field is editable — colors, typography, personality, values, target audience, and aesthetic narrative. Your brand, your rules." },
  { n: "03", title: "Generate assets instantly", body: "Pick a template or describe what you need. Get polished, on-brand visuals sized for every platform — in seconds." },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { title: "Deep URL Extraction", body: "CSS variables, inline styles, Google Fonts, JSON-LD schema, Open Graph metadata — we read everything your site publishes." },
  { title: "Logo-Only Mode",      body: "No website? Upload your logo PNG, JPG, or SVG. Claude Vision analyzes colors, shape language, and visual personality." },
  { title: "Editable Brand DNA",  body: "Colors, tone, audience, values, messaging — all editable before generation. Your brand kit, always accurate." },
  { title: "8-Platform Resize",   body: "One generation, 8 sizes: Instagram (1:1, 9:16), Facebook, LinkedIn, Twitter/X, Pinterest, YouTube, Square Ad." },
  { title: "4K Output",           body: "Every generation runs at 4K for ultra-sharp visuals up to 2048px. Export PNG, JPG, or WebP." },
  { title: "Brand Lock",          body: "Set design guardrails — allowed colors, logo position, CTA tone. Every future generation respects your constraints automatically." },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "How does URL extraction work?", a: "We fetch your website, parse CSS for color variables and font-family declarations, read JSON-LD schema for brand name and description, check Open Graph metadata for logos, then run Claude AI to infer tone, personality, target audience, and strategy. Most brands get accurate colors and fonts on the first pass." },
  { q: "What if I only have a logo?",   a: "Upload your logo — we use Claude Vision to analyze dominant colors, shape language, and visual personality, then build your full Brand DNA from that." },
  { q: "How do credits work?",          a: "You get 10 free credits on signup. Each 4K generation costs 2 credits. Credits never expire. Buy more anytime." },
  { q: "Can I edit the brand kit after extraction?", a: "Yes. Every field is editable — colors, fonts, tone, personality, audience, values. Changes apply to all future generations immediately." },
  { q: "What platforms are supported?", a: "Instagram Post (1080×1080), Instagram Story (1080×1920), Facebook Post (1200×630), LinkedIn Post (1200×628), Twitter/X (1600×900), Pinterest Pin (1000×1500), YouTube Thumbnail (1280×720), Square Ad (1200×1200)." },
  { q: "Is there a free plan?",         a: "Yes. 10 free credits on signup — no credit card required. Generate up to 5 assets before upgrading." },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: session, status } = useSession();
  const [faq, setFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-surface-900 text-white">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-surface-900/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 shadow-lg shadow-brand-500/30">
              <span className="text-sm font-bold text-white">B</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-white">BrandBloom</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-stone-500 sm:flex">
            <a href="#how"      className="transition-colors hover:text-white">How it works</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#pricing"  className="transition-colors hover:text-white">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <div className="h-4 w-24 animate-pulse rounded bg-surface-700" />
            ) : session ? (
              <Link href="/dashboard" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-400 active:scale-[0.99]">
                Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden text-sm text-stone-400 transition-colors hover:text-white sm:block">Sign in</Link>
                <Link href="/register" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-400 active:scale-[0.99]">
                  Create account →
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-36 sm:pt-44">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 opacity-[0.06]"
          style={{ background: "radial-gradient(ellipse, #ea751d 0%, transparent 65%)", filter: "blur(60px)" }} />

        <div className="relative mx-auto max-w-4xl text-center">

          {/* Badge */}
          <div className="reveal mb-8 inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-300 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
            AI brand intelligence · URL, logo, or Instagram
          </div>

          {/* Headline */}
          <h1 className="reveal reveal-delay-1 mb-6 text-balance text-[2.8rem] font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[5rem]">
            Brand assets that{" "}
            <em className="font-display italic text-brand-400">actually match</em>
            <br className="hidden sm:block" />
            {" "}your identity.
          </h1>

          <p className="reveal reveal-delay-2 mx-auto mb-10 max-w-lg text-base leading-relaxed text-stone-400 sm:text-lg">
            Drop your URL or logo. BrandBloom reads your complete visual identity and generates polished, on-brand assets for every platform — in seconds.
          </p>

          <div className="reveal reveal-delay-3 flex justify-center">
            <UrlForm size="lg" />
          </div>

          <p className="reveal reveal-delay-4 mt-4 text-sm text-stone-600">
            No website?{" "}
            <Link href="/analyze" className="text-brand-400 underline underline-offset-2 transition-colors hover:text-brand-300">
              Upload your logo instead →
            </Link>
          </p>

          {/* Stats */}
          <div className="reveal reveal-delay-5 mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <span className="flex items-center gap-2 text-stone-500">
              <span className="text-base font-bold text-white">12,400+</span> brands analyzed
            </span>
            <span className="hidden h-4 w-px bg-surface-600 sm:block" />
            <span className="flex items-center gap-2 text-stone-500">
              <span className="text-base font-bold text-white">3.2M+</span> assets generated
            </span>
            <span className="hidden h-4 w-px bg-surface-600 sm:block" />
            <span className="flex items-center gap-2 text-stone-500">
              <span className="text-base font-bold text-white">Free</span> to get started
            </span>
          </div>
        </div>
      </section>

      {/* ── BRAND STRIP ─────────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.04] px-4 py-5">
        <div className="mx-auto max-w-5xl">
          <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-700">
            Used by founders, designers & marketing teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {["Aethera Skin", "Volta Coffee", "Lune Studio", "Apex Capital", "Celeste", "Forge & Co.", "Meridian Labs", "Onyx Creative"].map((name) => (
              <span key={name} className="text-sm font-semibold text-stone-700 transition-colors hover:text-stone-500">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY ─────────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">Generated by BrandBloom</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              See what your brand{" "}
              <em className="font-display italic text-brand-400">could look like</em>
            </h2>
            <p className="mt-3 text-sm text-stone-500">Every card is AI-generated from a real brand profile — not a template.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            {GALLERY.map((item, i) => <GalleryCard key={item.brand} item={item} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── PRODUCT DEMO ────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">How the magic works</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              From URL to brand kit{" "}
              <em className="font-display italic text-brand-400">in under 60 seconds</em>
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">

            {/* Left — Extraction card */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800/60 p-6 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20">
                  <svg className="h-4 w-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">Brand Extraction</span>
                <span className="ml-auto rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-300">Live</span>
              </div>

              {/* URL input mockup */}
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-surface-600 bg-surface-900 px-4 py-3">
                <span className="text-xs text-stone-600">https://</span>
                <span className="text-sm text-white">volta.coffee</span>
                <span className="animate-cursor ml-0.5 inline-block h-4 w-0.5 bg-brand-400" />
              </div>

              {/* Progress */}
              <div className="space-y-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-700">
                  <div className="h-full rounded-full bg-brand-500 animate-scan" />
                </div>
                {[
                  { label: "Reading CSS variables & fonts", done: true },
                  { label: "Extracting color palette", done: true },
                  { label: "Analyzing brand personality", done: true },
                  { label: "Building strategy profile", done: false },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-2.5">
                    <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${step.done ? "bg-green-400" : "animate-pulse bg-brand-400"}`} />
                    <span className={`text-xs ${step.done ? "text-stone-400" : "text-white"}`}>{step.label}</span>
                    {step.done && <span className="ml-auto text-[10px] text-green-400">✓</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Brand DNA card */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800/60 p-6 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black text-white"
                  style={{ background: "#f97316" }}>V</div>
                <div>
                  <p className="text-sm font-bold text-white">Volta Coffee</p>
                  <p className="text-xs text-stone-500">volta.coffee · Coffee Brand</p>
                </div>
                <span className="ml-auto rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-300">High confidence</span>
              </div>

              {/* Colors */}
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">Brand Colors</p>
                <div className="flex gap-2">
                  {["#f97316", "#92400e", "#1a0d02", "#fef3c7", "#78350f"].map((c) => (
                    <div key={c} className="group relative">
                      <div className="h-8 w-8 rounded-lg border border-white/10 shadow-sm" style={{ backgroundColor: c }} />
                      <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 rounded text-[8px] text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tone", value: "Premium, Artisanal" },
                  { label: "Archetype", value: "The Sage" },
                  { label: "Audience", value: "25–40, urban professionals" },
                  { label: "Fonts", value: "Playfair + Inter" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-surface-700/60 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-600">{item.label}</p>
                    <p className="mt-0.5 text-xs font-medium text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <Link href="/register"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400">
                Try with your brand →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">Simple by design</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Three steps. One brand system.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.n} className="group rounded-2xl border border-surface-600 bg-surface-800/40 p-6 shadow-card transition-all hover:border-surface-500 hover:shadow-card-hover">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/20">
                    <span className="font-mono text-sm font-bold text-brand-400">{step.n}</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className={`h-1 w-4 rounded-full transition-colors ${j <= i ? "bg-brand-500" : "bg-surface-600"}`} />
                    ))}
                  </div>
                </div>
                <h3 className="mb-2 text-sm font-bold text-white">{step.title}</h3>
                <p className="text-xs leading-relaxed text-stone-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">Everything you need</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Built to beat the{" "}
              <em className="font-display italic text-brand-400">best tools</em>
            </h2>
            <p className="mt-3 text-sm text-stone-500">Enterprise design intelligence — without the learning curve or the price tag.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className="group rounded-2xl border border-surface-600 bg-surface-800/30 p-5 shadow-card transition-all hover:border-surface-500 hover:bg-surface-800/60 hover:shadow-card-hover">
                <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/15">
                  <div className="h-1 w-4 rounded-full bg-brand-500" />
                </div>
                <h3 className="mb-2 text-sm font-bold text-white">{f.title}</h3>
                <p className="text-xs leading-relaxed text-stone-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">What people say</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Trusted by builders{" "}
              <em className="font-display italic text-brand-400">who ship fast</em>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name}
                className="flex flex-col rounded-2xl border border-surface-600 bg-surface-800/40 p-6 shadow-card transition-all hover:border-surface-500 hover:shadow-card-hover">
                {/* Stars */}
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="h-3.5 w-3.5 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-stone-300">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: t.color }}>
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-stone-600">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">Pricing</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Start free. Scale as you grow.</h2>
            <p className="mt-3 text-sm text-stone-500">No contracts. Cancel anytime.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: "Free", price: "$0", period: "forever", highlight: false,
                features: ["10 credits on signup", "URL & logo extraction", "All asset types", "PNG / JPG / WebP export", "Brand DNA editor"],
                cta: "Get started free", href: "/register" },
              { name: "Pro", price: "$19", period: "per month", highlight: true,
                features: ["200 credits / month", "Everything in Free", "4K output", "Photo → branded", "8-platform resize", "Priority generation"],
                cta: "Start Pro", href: "/register" },
              { name: "Agency", price: "$79", period: "per month", highlight: false,
                features: ["Unlimited credits", "Multiple brands", "Campaign planning", "Brand Lock", "API access", "Priority support"],
                cta: "Contact us", href: "/register" },
            ].map((plan) => (
              <div key={plan.name}
                className={`relative rounded-2xl border p-6 shadow-card transition-all ${
                  plan.highlight
                    ? "border-brand-500/50 bg-surface-800/70 ring-1 ring-brand-500/20 hover:shadow-card-hover"
                    : "border-surface-600 bg-surface-800/30 hover:border-surface-500"
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-white shadow-lg shadow-brand-500/30">
                    Most popular
                  </div>
                )}
                <p className={`text-xs font-semibold uppercase tracking-wider ${plan.highlight ? "text-brand-400" : "text-stone-500"}`}>{plan.name}</p>
                <p className="mt-3 text-4xl font-bold text-white">{plan.price}</p>
                <p className="mt-0.5 text-xs text-stone-600">{plan.period}</p>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="text-brand-500">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}
                  className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400"
                      : "border border-surface-500 text-white hover:border-surface-400 hover:bg-surface-700/40"
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">Frequently asked</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-xl border border-surface-600 bg-surface-800/30 transition-colors hover:border-surface-500">
                <button type="button" onClick={() => setFaq(faq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-white">
                  <span>{f.q}</span>
                  <span className={`ml-4 shrink-0 text-stone-500 transition-transform duration-200 ${faq === i ? "rotate-180" : ""}`}>↓</span>
                </button>
                {faq === i && (
                  <div className="border-t border-surface-600 px-5 pb-4 pt-3 text-sm leading-relaxed text-stone-500">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-brand-500/15 bg-surface-800/50 px-8 py-20 text-center shadow-card">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ background: "radial-gradient(ellipse at 50% 0%, #ea751d 0%, transparent 60%)" }} />
          <p className="relative text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">Start today</p>
          <h2 className="relative mt-3 text-4xl font-bold text-white">
            Your brand deserves{" "}
            <em className="font-display italic text-brand-400">better assets.</em>
          </h2>
          <p className="relative mt-3 text-sm text-stone-500">10 free credits. No credit card. Results in 60 seconds.</p>
          <div className="relative mt-8 flex justify-center">
            <UrlForm size="md" />
          </div>
          <p className="relative mt-4 text-sm text-stone-600">
            Or{" "}
            <Link href="/analyze" className="text-brand-400 underline underline-offset-2 transition-colors hover:text-brand-300">upload a logo</Link>
            {" "}to get started.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-stone-600 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 text-[10px] font-bold text-white shadow-sm shadow-brand-500/30">B</div>
            <span className="font-semibold text-stone-400">BrandBloom</span>
          </div>
          <p>© {new Date().getFullYear()} BrandBloom. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/terms"   className="transition-colors hover:text-stone-400">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-stone-400">Privacy</Link>
            <a href="mailto:support@brandbloom.ai" className="transition-colors hover:text-stone-400">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

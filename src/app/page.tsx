"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Typing animation words ───────────────────────────────────────────────────
const WORDS = ["Instagram ads", "product shots", "email headers", "LinkedIn banners", "YouTube thumbnails", "pitch decks"];

function TypingWord() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && text.length < word.length) {
      t = setTimeout(() => setText(word.slice(0, text.length + 1)), 65);
    } else if (!deleting && text.length === word.length) {
      t = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && text.length > 0) {
      t = setTimeout(() => setText(text.slice(0, -1)), 35);
    } else {
      setDeleting(false);
      setIdx((i) => (i + 1) % WORDS.length);
    }
    return () => clearTimeout(t);
  }, [text, deleting, idx]);

  return (
    <span className="text-brand-400">
      {text}
      <span className="animate-pulse opacity-80">|</span>
    </span>
  );
}

// ─── Gallery mock cards ───────────────────────────────────────────────────────
const GALLERY_ITEMS = [
  { label: "Instagram Story", brand: "Aethera Skin", tag: "Skincare", bg: "#160a22", accent: "#c084fc", shape: "circle" },
  { label: "Product Shot", brand: "Volta Coffee", tag: "Coffee Brand", bg: "#1a0d04", accent: "#f97316", shape: "triangle" },
  { label: "Facebook Ad", brand: "Lune Studio", tag: "Architecture", bg: "#080f1a", accent: "#60a5fa", shape: "square" },
  { label: "LinkedIn Banner", brand: "Apex Capital", tag: "Finance", bg: "#061610", accent: "#34d399", shape: "diamond" },
  { label: "Email Header", brand: "Celeste Fashion", tag: "Fashion", bg: "#1a060e", accent: "#f472b6", shape: "circle" },
  { label: "YouTube Thumb", brand: "Forge & Co.", tag: "Hardware", bg: "#0f0f0f", accent: "#fbbf24", shape: "triangle" },
];

function GalleryCard({ item, i }: { item: typeof GALLERY_ITEMS[0]; i: number }) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] transition-transform duration-300 hover:-translate-y-1"
      style={{ background: item.bg }}
    >
      <div className="relative aspect-square overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at ${i % 2 === 0 ? "30% 40%" : "70% 60%"}, ${item.accent}30 0%, transparent 65%)` }} />
        {/* Geometric shape */}
        <div className="absolute inset-0 flex items-center justify-center">
          {item.shape === "circle" && (
            <div className="h-20 w-20 rounded-full border-2 opacity-20" style={{ borderColor: item.accent }} />
          )}
          {item.shape === "triangle" && (
            <div className="h-0 w-0 opacity-20" style={{ borderLeft: "36px solid transparent", borderRight: "36px solid transparent", borderBottom: `62px solid ${item.accent}` }} />
          )}
          {item.shape === "square" && (
            <div className="h-20 w-20 rotate-12 border-2 opacity-20" style={{ borderColor: item.accent }} />
          )}
          {item.shape === "diamond" && (
            <div className="h-16 w-16 rotate-45 border-2 opacity-20" style={{ borderColor: item.accent }} />
          )}
        </div>
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
          <div className="h-0.5 w-10 rounded-full" style={{ background: item.accent }} />
          <p className="text-sm font-bold text-white">{item.brand}</p>
          <div className="h-px w-16 rounded-full bg-white/10" />
          <div className="mt-1 h-5 w-20 rounded-md opacity-50" style={{ background: item.accent }} />
          <div className="mt-1 h-3 w-14 rounded opacity-25" style={{ background: item.accent }} />
        </div>
      </div>
      <div className="border-t border-white/[0.04] p-3">
        <p className="text-xs font-semibold text-white">{item.label}</p>
        <p className="text-xs text-stone-600">{item.tag}</p>
      </div>
      {/* Hover */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
          AI-generated ✨
        </div>
      </div>
    </div>
  );
}

// ─── Hero URL form ────────────────────────────────────────────────────────────
function UrlForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const id = compact ? "url-compact" : "url-main";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v) { ref.current?.focus(); return; }
    setLoading(true);
    const href = v.startsWith("http") ? v : `https://${v}`;
    router.push(`/analyze?url=${encodeURIComponent(href)}`);
  }

  return (
    <form onSubmit={submit} className={`flex w-full ${compact ? "max-w-lg" : "max-w-xl"} flex-col gap-3 sm:flex-row`}>
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          </svg>
        </span>
        <input
          id={id}
          ref={ref}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourbrand.com"
          className={`w-full rounded-2xl border border-surface-600 bg-surface-800/90 pl-10 pr-4 text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${compact ? "h-12 text-sm" : "h-14"}`}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`shrink-0 rounded-2xl bg-brand-500 font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 disabled:opacity-60 ${compact ? "h-12 px-6 text-sm" : "h-14 px-8"}`}
      >
        {loading
          ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Analyzing…</span>
          : "Extract Brand →"}
      </button>
    </form>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { n: "01", icon: "🌐", title: "Add your website or logo", body: "Paste your URL and BrandBloom reads CSS variables, fonts, colors, JSON-LD schema, and tone in seconds. No website? Upload your logo instead." },
  { n: "02", icon: "🧬", title: "Review your Brand DNA", body: "Every extracted field is editable — colors, typography, personality, values, target audience, and aesthetic narrative. Your brand, your rules." },
  { n: "03", icon: "✨", title: "Generate assets instantly", body: "Pick a template or describe what you need. Get polished, on-brand visuals sized for every platform — in seconds." },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "🌐", title: "Deep URL Extraction", body: "CSS variables, inline styles, Google Fonts, JSON-LD schema, Open Graph metadata — we read everything." },
  { icon: "🖼️", title: "Logo-Only Mode", body: "No website? Upload your logo PNG, JPG, or SVG. Claude Vision analyzes it and builds your full Brand DNA." },
  { icon: "✏️", title: "Editable Brand DNA", body: "Colors, tone, audience, values, messaging — all editable before generation. Inspired by Pomelli, built for creators." },
  { icon: "📐", title: "8-Platform Resize", body: "One generation, 8 sizes: Instagram (1:1, 9:16), Facebook, LinkedIn, Twitter/X, Pinterest, YouTube, Square Ad." },
  { icon: "🔲", title: "4K Output", body: "Toggle 4K for ultra-sharp visuals at up to 2048px — ready for print, web, and pitch decks." },
  { icon: "📸", title: "Photo → Branded", body: "Upload a product photo. Flux img2img transforms it with your brand's colors, style, and aesthetic." },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "How does URL extraction work?", a: "We fetch your website, parse CSS for color variables and font-family declarations, read JSON-LD schema for brand name and description, check Open Graph metadata for logos, then run Claude AI to infer tone, personality, target audience, and strategy. Most brands get accurate colors and fonts on the first pass." },
  { q: "What if I only have a logo?", a: "That's what Logo Mode is for. Upload your logo, tell us your brand name and a bit about your business — we use Claude Vision to analyze dominant colors, shape language, and visual personality, then build your full Brand DNA from that." },
  { q: "How does logo generation work?", a: "Our agent pipeline runs: strategy analysis → 5 concept prompts → Flux image generation → AI critique and ranking. You get 5 logo concepts scored against your brand strategy, with usage guidelines for each." },
  { q: "How do credits work?", a: "You get 10 free credits on signup. Standard generation = 1 credit, 4K = 2 credits. Credits never expire. Buy more anytime." },
  { q: "Can I edit the brand kit after extraction?", a: "Yes. The Brand DNA Editor lets you change every field — primary and secondary colors (with hex pickers), heading and body fonts, tone, personality, target audience, values, key messages, and aesthetic narrative. Changes apply to all future generations immediately." },
  { q: "What platforms are supported for resize?", a: "Instagram Post (1080×1080), Instagram Story (1080×1920), Facebook Post (1200×630), LinkedIn Post (1200×628), Twitter/X (1600×900), Pinterest Pin (1000×1500), YouTube Thumbnail (1280×720), Square Ad (1200×1200)." },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [faq, setFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-surface-900 text-white">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-surface-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-5 w-5" fill="none">
                <rect width="32" height="32" rx="8" fill="#ea751d"/>
                <text x="16" y="22" fontFamily="system-ui" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle">B</text>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-white">BrandBloom</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-stone-500 sm:flex">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-stone-400 hover:text-white transition-colors sm:block">Sign in</Link>
            <Link href="/register" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400">
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:pt-44">
        {/* Ambient gradient */}
        <div
          className="pointer-events-none absolute left-1/2 top-10 h-[600px] w-[900px] -translate-x-1/2 opacity-[0.07]"
          style={{ background: "radial-gradient(ellipse, #ea751d 0%, transparent 65%)", filter: "blur(40px)" }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          {/* Pill badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-300 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
            AI-powered brand asset generator
          </div>

          {/* Headline */}
          <h1 className="mb-5 text-[2.75rem] font-bold leading-[1.13] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]">
            Your brand.<br />
            Professional <TypingWord /><br />
            <span className="text-stone-400">in seconds.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-stone-500 sm:text-lg">
            Paste your website URL or upload your logo. BrandBloom reads your complete visual identity and generates polished on-brand assets for every platform.
          </p>

          <UrlForm />

          <p className="mt-4 text-sm text-stone-600">
            No website?{" "}
            <Link href="/create-brand" className="text-brand-400 underline underline-offset-2 hover:text-brand-300">
              Upload your logo instead →
            </Link>
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-stone-600">
            <span className="flex items-center gap-1.5"><span className="text-brand-500">✓</span>10 free credits on signup</span>
            <span className="flex items-center gap-1.5"><span className="text-brand-500">✓</span>No credit card required</span>
            <span className="flex items-center gap-1.5"><span className="text-brand-500">✓</span>Works with any public website</span>
          </div>
        </div>
      </section>

      {/* ── GALLERY ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">Generated by BrandBloom</p>
            <h2 className="mt-2 text-2xl font-bold text-white">See what your brand could look like</h2>
            <p className="mt-1.5 text-sm text-stone-500">Every card below is AI-generated from a real brand profile — not a template.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            {GALLERY_ITEMS.map((item, i) => <GalleryCard key={item.brand} item={item} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">Simple by design</p>
            <h2 className="mt-2 text-3xl font-bold text-white">From URL to assets in under a minute</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl border border-surface-600 bg-surface-800/40 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="font-mono text-xs font-bold text-brand-500/50">{step.n}</span>
                </div>
                <h3 className="mb-2 text-sm font-bold text-white">{step.title}</h3>
                <p className="text-xs leading-relaxed text-stone-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">Everything you need</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Built to match the pros</h2>
            <p className="mt-2 text-sm text-stone-500">All the features of enterprise design tools — without the learning curve or the price tag.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-surface-600 bg-surface-800/30 p-5 transition hover:border-surface-500">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 text-sm font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DUAL ENTRY ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">Two ways to get started</h2>
            <p className="mt-2 text-sm text-stone-500">Pick whatever you have — a website URL or just your logo.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* URL */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800/40 p-7 transition hover:border-brand-500/30">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-xl">🌐</div>
              <h3 className="mb-1.5 text-base font-bold text-white">Start with your website</h3>
              <p className="mb-5 text-xs leading-relaxed text-stone-500">
                We extract your colors, fonts, tone, personality and strategy automatically from any public URL.
              </p>
              <UrlForm compact />
            </div>

            {/* Logo */}
            <div className="rounded-2xl border border-surface-600 bg-surface-800/40 p-7 transition hover:border-brand-500/30">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-xl">🖼️</div>
              <h3 className="mb-1.5 text-base font-bold text-white">Start with your logo</h3>
              <p className="mb-5 text-xs leading-relaxed text-stone-500">
                No website yet? Upload your logo and tell us about your brand. Claude Vision builds your full Brand DNA from the visual identity alone.
              </p>
              <div className="space-y-3">
                <Link
                  href="/create-brand"
                  className="flex items-center justify-center gap-2 rounded-xl border border-brand-500/60 py-2.5 text-sm font-semibold text-brand-400 transition hover:bg-brand-500 hover:text-white hover:border-brand-500"
                >
                  Upload your logo →
                </Link>
                <p className="text-center text-xs text-stone-600">PNG, JPG, SVG or WebP · up to 10MB</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-600">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Start free. Scale as you grow.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                highlight: false,
                features: ["10 credits on signup", "URL & logo extraction", "All asset types", "PNG / JPG / WebP export", "Brand DNA editor"],
                cta: "Get started free",
                href: "/register",
              },
              {
                name: "Pro",
                price: "$19",
                period: "per month",
                highlight: true,
                features: ["200 credits / month", "Everything in Free", "4K output", "Photo → branded", "8-platform resize", "Priority generation"],
                cta: "Start Pro",
                href: "/register",
              },
              {
                name: "Agency",
                price: "$79",
                period: "per month",
                highlight: false,
                features: ["Unlimited credits", "Multiple brands", "Campaign planning", "Logo generation agent", "API access", "Priority support"],
                cta: "Contact us",
                href: "/register",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 ${plan.highlight ? "border-brand-500/50 bg-surface-800/70 ring-1 ring-brand-500/20" : "border-surface-600 bg-surface-800/30"}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-white">Popular</div>
                )}
                <p className={`text-xs font-semibold uppercase tracking-wider ${plan.highlight ? "text-brand-400" : "text-stone-500"}`}>{plan.name}</p>
                <p className="mt-3 text-4xl font-bold text-white">{plan.price}</p>
                <p className="mt-0.5 text-xs text-stone-600">{plan.period}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="text-brand-500">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-semibold transition ${plan.highlight ? "bg-brand-500 text-white hover:bg-brand-400" : "border border-surface-500 text-white hover:border-surface-400"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">Frequently asked questions</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-xl border border-surface-600 bg-surface-800/30">
                <button
                  type="button"
                  onClick={() => setFaq(faq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-white"
                >
                  <span>{f.q}</span>
                  <span className={`ml-4 shrink-0 text-stone-500 transition-transform duration-200 ${faq === i ? "rotate-180" : ""}`}>↓</span>
                </button>
                {faq === i && (
                  <div className="border-t border-surface-600 px-5 pb-4 pt-3 text-xs leading-relaxed text-stone-500">
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
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-brand-500/15 bg-surface-800/50 px-8 py-20 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{ background: "radial-gradient(ellipse at 50% 0%, #ea751d 0%, transparent 60%)" }}
          />
          <p className="relative text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">Start today</p>
          <h2 className="relative mt-3 text-4xl font-bold text-white">Your brand deserves better assets.</h2>
          <p className="relative mt-3 text-sm text-stone-500">10 free credits. No credit card. Results in 60 seconds.</p>
          <div className="relative mt-8 flex justify-center">
            <UrlForm />
          </div>
          <p className="relative mt-4 text-sm text-stone-600">
            Or{" "}
            <Link href="/create-brand" className="text-brand-400 underline underline-offset-2 hover:text-brand-300">
              upload a logo
            </Link>{" "}
            to get started.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-stone-600 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 text-[10px] font-bold text-white">B</div>
            <span className="font-semibold text-stone-400">BrandBloom</span>
          </div>
          <p>© {new Date().getFullYear()} BrandBloom. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-stone-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-stone-400 transition-colors">Privacy</Link>
            <a href="mailto:support@brandbloom.ai" className="hover:text-stone-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

type Tab = "url" | "logo";

type ExtractResult = {
  brand?: { id: string; name: string };
  brandId?: string;
  error?: string;
};

export default function AnalyzePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("url");

  // URL flow
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [urlStep, setUrlStep] = useState<"idle" | "scraping" | "analyzing" | "done">("idle");

  // Logo flow
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── URL flow ──────────────────────────────────────────────────────────────

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setUrlError("");
    setUrlLoading(true);
    setUrlStep("scraping");

    try {
      const withProto = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      setTimeout(() => setUrlStep("analyzing"), 4000);

      const res = await fetch("/api/extract-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: withProto }),
        credentials: "include",
      });

      const data: ExtractResult = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Failed to extract brand. Check the URL and try again.");
      }

      const brandId = data.brand?.id ?? data.brandId;
      setUrlStep("done");
      setTimeout(() => router.push(brandId ? `/dashboard?brandId=${brandId}` : "/dashboard"), 600);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Something went wrong.");
      setUrlStep("idle");
    } finally {
      setUrlLoading(false);
    }
  }

  // ── Logo flow ─────────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  async function handleLogoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logoFile) return;
    setLogoError("");
    setLogoLoading(true);

    try {
      const formData = new FormData();
      formData.append("logo", logoFile);
      if (brandName.trim()) formData.append("brandName", brandName.trim());

      const res = await fetch("/api/extract-brand-from-logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data: ExtractResult = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Failed to analyze logo. Try again.");
      }

      const brandId = data.brand?.id ?? data.brandId;
      router.push(brandId ? `/dashboard?brandId=${brandId}` : "/dashboard");
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLogoLoading(false);
    }
  }

  // ── Steps copy ────────────────────────────────────────────────────────────

  const steps: Record<typeof urlStep, string> = {
    idle: "",
    scraping: "Scanning your website…",
    analyzing: "Extracting brand identity…",
    done: "Brand saved! Taking you to your dashboard…",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-xl flex-col items-center justify-center px-4 py-16">

        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Add your brand
          </h1>
          <p className="mt-3 text-stone-400">
            Bloom learns your brand once — then you just describe what you need.
          </p>
        </div>

        {/* Card */}
        <div className="w-full rounded-3xl border border-surface-700 bg-surface-900 p-8 shadow-2xl shadow-black/60">

          {/* Tabs */}
          <div className="mb-7 flex rounded-xl border border-surface-700 bg-surface-800 p-1">
            {(["url", "logo"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setUrlError(""); setLogoError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  tab === t
                    ? "bg-brand-500 text-white shadow"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {t === "url" ? "🌐 Website URL" : "🖼 Upload Logo"}
              </button>
            ))}
          </div>

          {/* ── URL tab ── */}
          {tab === "url" && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">
                  Your website
                </label>
                <div className="flex overflow-hidden rounded-xl border border-surface-600 bg-surface-800 focus-within:border-brand-500 transition">
                  <span className="flex items-center pl-3.5 text-stone-600 text-sm select-none">
                    https://
                  </span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="yourbrand.com"
                    disabled={urlLoading}
                    className="flex-1 bg-transparent px-2 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none disabled:opacity-50"
                    autoFocus
                  />
                </div>
              </div>

              {/* Progress */}
              {urlLoading && (
                <div className="space-y-2">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-700">
                    <div
                      className={`h-full rounded-full bg-brand-500 transition-all duration-1000 ${
                        urlStep === "scraping" ? "w-1/3" :
                        urlStep === "analyzing" ? "w-2/3" :
                        urlStep === "done" ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                  <p className="text-center text-xs text-stone-500">{steps[urlStep]}</p>
                </div>
              )}

              {urlError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {urlError}
                </p>
              )}

              <button
                type="submit"
                disabled={urlLoading || !url.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
              >
                {urlLoading ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Analyzing…</>
                ) : (
                  "Analyze Brand →"
                )}
              </button>
            </form>
          )}

          {/* ── Logo tab ── */}
          {tab === "logo" && (
            <form onSubmit={handleLogoSubmit} className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition ${
                  dragOver
                    ? "border-brand-500 bg-brand-500/5"
                    : logoPreview
                    ? "border-surface-600"
                    : "border-surface-600 hover:border-surface-500"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="max-h-28 max-w-[200px] object-contain" />
                ) : (
                  <>
                    <span className="text-3xl">🖼</span>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">Drop your logo here</p>
                      <p className="text-xs text-stone-500">or click to browse · PNG, JPG, SVG, WebP</p>
                    </div>
                  </>
                )}
              </div>

              {logoPreview && (
                <button
                  type="button"
                  onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                  className="text-xs text-stone-600 hover:text-stone-400"
                >
                  Remove logo ×
                </button>
              )}

              {/* Brand name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">
                  Brand name <span className="text-stone-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-xl border border-surface-600 bg-surface-800 px-3.5 py-2.5 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              {logoError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {logoError}
                </p>
              )}

              <button
                type="submit"
                disabled={logoLoading || !logoFile}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
              >
                {logoLoading ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Analyzing…</>
                ) : (
                  "Analyze Brand →"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Already have brands */}
        <p className="mt-6 text-sm text-stone-600">
          Already set up?{" "}
          <Link href="/dashboard" className="text-brand-400 hover:text-brand-300">
            Go to dashboard →
          </Link>
        </p>
      </div>
    </main>
  );
}
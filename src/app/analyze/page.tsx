"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

type Tab = "url" | "logo";

type ExistingBrand = {
  id: string;
  name: string;
  domain: string;
};

// ─── Domain normalization (mirrors the backend logic) ─────────────────────────
// Must stay in sync with normalizeDomain() in extract-brand/route.ts
function normalizeDomain(raw: string): string {
  try {
    const withProto = raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`;
    const hostname = new URL(withProto).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return raw.trim().toLowerCase().replace(/^www\./, "").split("/")[0];
  }
}

export default function AnalyzePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("url");

  // Existing brands (fetched once on mount for duplicate detection)
  const [existingBrands, setExistingBrands] = useState<ExistingBrand[]>([]);
  const [brandsLoaded, setBrandsLoaded] = useState(false);

  // URL flow
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [urlStep, setUrlStep] = useState<"idle" | "scraping" | "analyzing" | "done">("idle");
  const [duplicateBrand, setDuplicateBrand] = useState<ExistingBrand | null>(null);

  // Logo flow
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load existing brands for client-side duplicate detection ──────────────

  useEffect(() => {
    fetch("/api/brands", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { brands: [] })
      .then((d: { brands?: ExistingBrand[] }) => {
        setExistingBrands(d.brands ?? []);
        setBrandsLoaded(true);
      })
      .catch(() => setBrandsLoaded(true));
  }, []);

  // ── Real-time duplicate check as user types ───────────────────────────────

  useEffect(() => {
    if (!url.trim() || !brandsLoaded) {
      setDuplicateBrand(null);
      return;
    }
    const domain = normalizeDomain(url);
    if (!domain || domain.length < 3) { setDuplicateBrand(null); return; }

    const match = existingBrands.find((b) => normalizeDomain(b.domain) === domain);
    setDuplicateBrand(match ?? null);
  }, [url, existingBrands, brandsLoaded]);

  // ── URL submit ────────────────────────────────────────────────────────────

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    // Block if duplicate already detected client-side
    if (duplicateBrand) return;

    setUrlError("");
    setUrlLoading(true);
    setUrlStep("scraping");

    try {
      const withProto = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      setTimeout(() => { if (urlStep !== "done") setUrlStep("analyzing"); }, 4000);

      const res = await fetch("/api/extract-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: withProto }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({})) as {
        brandId?: string;
        brand?: { id: string; name: string; domain: string };
        alreadyExists?: boolean;
        error?: string;
      };

      // Handle 409 — brand already exists (caught at backend)
      if (res.status === 409 || data.alreadyExists) {
        const existing: ExistingBrand = {
          id: data.brand?.id ?? data.brandId ?? "",
          name: data.brand?.name ?? "this brand",
          domain: data.brand?.domain ?? normalizeDomain(trimmed),
        };
        setDuplicateBrand(existing);
        setUrlLoading(false);
        setUrlStep("idle");
        return;
      }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Failed to extract brand. Check the URL and try again.");
      }

      const brandId = data.brand?.id ?? data.brandId;
      setUrlStep("done");
      setTimeout(() => router.push(brandId ? `/dashboard?brandId=${brandId}&new=1` : "/dashboard"), 600);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Something went wrong.");
      setUrlStep("idle");
      setUrlLoading(false);
    }
  }

  // ── Logo submit ───────────────────────────────────────────────────────────

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
      const formData = new FormData();
      formData.append("logo", logoFile);
      if (brandName.trim()) formData.append("brandName", brandName.trim());

      const res = await fetch("/api/extract-brand-from-logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({})) as {
        brand?: { id: string };
        brandId?: string;
        alreadyExists?: boolean;
        error?: string;
      };

      if (res.status === 409 || data.alreadyExists) {
        setLogoError("A brand with this name already exists in your workspace.");
        setLogoLoading(false);
        return;
      }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Failed to analyze logo. Try again.");
      }

      const brandId = data.brand?.id ?? data.brandId;
      router.push(brandId ? `/dashboard?brandId=${brandId}&new=1` : "/dashboard");
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Something went wrong.");
      setLogoLoading(false);
    }
  }

  // ── Progress copy ─────────────────────────────────────────────────────────

  const stepLabel: Record<typeof urlStep, string> = {
    idle: "",
    scraping: "Scanning your website…",
    analyzing: "Extracting brand identity…",
    done: "Brand saved! Heading to your workspace…",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-xl flex-col items-center justify-center px-4 py-16">

        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">Add your brand</h1>
          <p className="mt-3 text-stone-400">
            BrandBloom learns your brand once. After that, just describe what you need.
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
                onClick={() => { setTab(t); setUrlError(""); setLogoError(""); setDuplicateBrand(null); }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  tab === t ? "bg-brand-500 text-white shadow" : "text-stone-500 hover:text-stone-300"
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
                <div className={`flex overflow-hidden rounded-xl border bg-surface-800 transition focus-within:border-brand-500 ${
                  duplicateBrand ? "border-amber-500/60" : "border-surface-600"
                }`}>
                  <span className="flex items-center pl-3.5 text-stone-600 text-sm select-none">https://</span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                    placeholder="yourbrand.com"
                    disabled={urlLoading}
                    autoFocus
                    className="flex-1 bg-transparent px-2 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Duplicate warning — real time, before submission */}
              {duplicateBrand && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <p className="text-sm font-medium text-amber-300">
                    "{duplicateBrand.name}" is already in your workspace
                  </p>
                  <p className="mt-1 text-xs text-amber-400/70">
                    Each brand can only be added once. Go to your dashboard to generate assets for it.
                  </p>
                  <Link
                    href={`/dashboard?brandId=${duplicateBrand.id}`}
                    className="mt-3 inline-block rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                  >
                    Open in Dashboard →
                  </Link>
                </div>
              )}

              {/* Progress bar */}
              {urlLoading && (
                <div className="space-y-2">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-700">
                    <div className={`h-full rounded-full bg-brand-500 transition-all duration-1000 ${
                      urlStep === "scraping" ? "w-1/3" :
                      urlStep === "analyzing" ? "w-2/3" :
                      urlStep === "done" ? "w-full" : "w-0"
                    }`} />
                  </div>
                  <p className="text-center text-xs text-stone-500">{stepLabel[urlStep]}</p>
                </div>
              )}

              {urlError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {urlError}
                </p>
              )}

              <button
                type="submit"
                disabled={urlLoading || !url.trim() || !!duplicateBrand}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
              >
                {urlLoading ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Analyzing…</>
                ) : "Analyze Brand →"}
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
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition ${
                  dragOver ? "border-brand-500 bg-brand-500/5" : "border-surface-600 hover:border-surface-500"
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
                <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                  className="text-xs text-stone-600 hover:text-stone-400">
                  Remove logo ×
                </button>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">
                  Brand name <span className="text-stone-600">(recommended)</span>
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
                ) : "Analyze Brand →"}
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
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
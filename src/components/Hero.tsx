"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type EntryMode = "website" | "logo";

export function Hero() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<EntryMode>("website");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoBrandName, setLogoBrandName] = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [urlSubmitting, setUrlSubmitting] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  function handleWebsiteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a website URL.");
      return;
    }
    if (urlSubmitting) return;
    try {
      const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setError("Please enter a valid http or https URL.");
        return;
      }
      const analyzeUrl = `/analyze?url=${encodeURIComponent(parsed.href)}`;
      if (status === "unauthenticated") {
        router.push(`/login?callbackUrl=${encodeURIComponent(analyzeUrl)}`);
        return;
      }
      setUrlSubmitting(true);
      router.push(analyzeUrl);
    } catch {
      setError("Please enter a valid URL (e.g. https://example.com).");
    }
  }

  async function handleLogoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/#get-started")}`);
      return;
    }
    if (!logoFile) {
      setError("Please select a logo file.");
      return;
    }
    setLogoLoading(true);
    try {
      const formData = new FormData();
      formData.set("logo", logoFile);
      if (logoBrandName.trim()) formData.set("brandName", logoBrandName.trim());
      const res = await fetch("/api/extract-brand-from-logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = res.status === 503
          ? (data.error || "Logo analysis requires OpenAI. Add OPENAI_API_KEY to your server environment.")
          : (data.error || "Failed to create brand from logo.");
        setError(message);
        setLogoLoading(false);
        return;
      }
      const brandId = data.brandId;
      if (brandId) {
        router.push(`/analyze?brandId=${encodeURIComponent(brandId)}&stage=review`);
      } else {
        setError("No brand ID returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLogoLoading(false);
    }
  }

  return (
    <section
      id="get-started"
      className="relative gradient-mesh pt-32 pb-24 sm:pt-40 sm:pb-32"
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="mb-4 animate-fade-in text-sm font-medium uppercase tracking-widest text-brand-400 opacity-90">
          AI Brand Asset Generator
        </p>
        <h1 className="mb-6 animate-slide-up text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          Create on-brand assets
          <br />
          <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
            from your website or logo
          </span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-stone-400 sm:text-xl">
          Paste your site or upload a logo. We learn your brand. Generate posts, stories, and banners in your style.
        </p>

        <div className="mx-auto mb-6 flex max-w-md justify-center gap-2 rounded-xl bg-surface-800/60 p-1">
          <button
            type="button"
            onClick={() => setMode("website")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${mode === "website" ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}
          >
            Start with Website
          </button>
          <button
            type="button"
            onClick={() => setMode("logo")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${mode === "logo" ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}
          >
            Start with Logo
          </button>
        </div>

        {mode === "website" && (
          <form
            onSubmit={handleWebsiteSubmit}
            className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row"
          >
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-website.com"
              className="flex-1 rounded-xl border border-surface-600 bg-surface-800 px-5 py-4 text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <button
              type="submit"
              disabled={urlSubmitting}
              className="rounded-xl bg-brand-500 px-8 py-4 font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
            >
              {urlSubmitting ? "Opening…" : "Get started"}
            </button>
          </form>
        )}

        {mode === "logo" && (
          <form
            onSubmit={handleLogoSubmit}
            className="mx-auto flex max-w-xl flex-col gap-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-surface-600 bg-surface-800 px-5 py-4 text-stone-300 transition hover:border-brand-500/50 hover:bg-surface-700">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
                {logoFile ? logoFile.name : "Choose logo (PNG, JPEG, WebP, SVG)"}
              </label>
              <input
                type="text"
                value={logoBrandName}
                onChange={(e) => setLogoBrandName(e.target.value)}
                placeholder="Brand name (optional)"
                className="rounded-xl border border-surface-600 bg-surface-800 px-5 py-4 text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:w-48"
              />
            </div>
            <button
              type="submit"
              disabled={!logoFile || logoLoading}
              className="rounded-xl bg-brand-500 px-8 py-4 font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
            >
              {logoLoading ? "Creating brand…" : "Get started"}
            </button>
          </form>
        )}

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <p className="mt-4 text-sm text-stone-500">
          Sign in to create and save brand assets. We track usage per account so you can manage your brands.
        </p>
        <p className="mt-2 text-sm text-stone-500">
          10 free credits · No card required
        </p>
        <a
          href="#how-it-works"
          className="mt-6 inline-block text-sm font-medium text-brand-400 transition hover:text-brand-300"
        >
          See how it works
        </a>
      </div>
    </section>
  );
}

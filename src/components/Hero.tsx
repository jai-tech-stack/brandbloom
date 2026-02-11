"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Hero() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a website URL.");
      return;
    }
    try {
      const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setError("Please enter a valid http or https URL.");
        return;
      }
      router.push(`/analyze?url=${encodeURIComponent(parsed.href)}`);
    } catch {
      setError("Please enter a valid URL (e.g. https://example.com).");
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
          Brand assets
          <br />
          <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
            made effortless
          </span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-stone-400 sm:text-xl">
          Add your website. Enter your URL below — BrandBloom instantly scans your site to understand your brand.
        </p>
        <form
          onSubmit={handleSubmit}
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
            className="rounded-xl bg-brand-500 px-8 py-4 font-semibold text-white transition hover:bg-brand-400"
          >
            Get started
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <p className="mt-4 text-sm text-stone-500">
          No signup required to try. We never store your URL without permission.
        </p>
      </div>
    </section>
  );
}

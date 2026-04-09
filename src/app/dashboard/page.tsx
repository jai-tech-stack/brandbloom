"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { BrandKitDownload } from "@/components/BrandKitDownload";

// ─── Types ────────────────────────────────────────────────────────────────────

type Brand = {
  id: string;
  name: string;
  domain: string;
  siteUrl: string;
  colors: string[] | string;
  image: string | null;
  extraction?: {
    confidence: number;
    confidenceLabel: "high" | "medium" | "low";
    sourceType: string;
  };
  _count?: { assets: number };
};

type Asset = {
  id: string;
  url: string;
  label: string;
  type: string;
  width: number;
  height: number;
  prompt?: string | null;
  sourceIdea?: string | null;
  createdAt: string;
  brand?: { id: string; name: string; domain: string; siteUrl: string } | null;
};

type GeneratingState = "idle" | "planning" | "generating" | "done";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseColors(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconOpen = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
    <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/>
    <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z"/>
  </svg>
);
const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ─── Size options ─────────────────────────────────────────────────────────────

const SIZE_OPTIONS = [
  { label: "Square", value: "1024x1024", hint: "IG Post" },
  { label: "Portrait", value: "1024x1344", hint: "Story" },
  { label: "Landscape", value: "1344x768", hint: "Banner" },
  { label: "Wide", value: "1536x640", hint: "LinkedIn" },
];

// ─── Platform variant sizes ───────────────────────────────────────────────────

const VARIANT_PLATFORMS = [
  { label: "IG Post", aspectRatio: "1:1", size: "1024×1024" },
  { label: "IG Story", aspectRatio: "9:16", size: "1024×1344" },
  { label: "Banner", aspectRatio: "16:9", size: "1344×768" },
  { label: "LinkedIn", aspectRatio: "21:9", size: "1536×640" },
  { label: "Pinterest", aspectRatio: "2:3", size: "1024×1536" },
];

// ─── Variant Modal ────────────────────────────────────────────────────────────

function VariantModal({ asset, onClose, onVariantCreated }: {
  asset: Asset;
  onClose: () => void;
  onVariantCreated: (a: Asset) => void;
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function generate(aspectRatio: string) {
    if (!asset.brand?.id || generating) return;
    setError("");
    setGenerating(aspectRatio);
    try {
      const res = await fetch("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: asset.brand.id,
          promptOverride: asset.prompt || asset.label,
          aspectRatio,
          quality: "4k",
          premiumIdeas: true,
          limit: 1,
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({})) as { assets?: Asset[]; asset?: Asset; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed.");
      const newAsset = data.assets?.[0] ?? data.asset;
      if (newAsset) { onVariantCreated(newAsset); onClose(); }
      else throw new Error("No asset returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setGenerating(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-surface-600 bg-surface-800 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Resize asset</h3>
            <p className="text-xs text-stone-500 mt-0.5">Generate a variant at a different size</p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-600 hover:text-white transition text-lg leading-none">×</button>
        </div>

        {/* Original asset preview */}
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-700 p-3">
          {asset.url && (
            <img src={asset.url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{asset.label}</p>
            <p className="text-[10px] text-stone-500">{asset.width}×{asset.height} · original</p>
          </div>
        </div>

        {/* Platform options */}
        <div className="space-y-1.5">
          {VARIANT_PLATFORMS.map((p) => {
            const isGenerating = generating === p.aspectRatio;
            return (
              <button
                key={p.aspectRatio}
                type="button"
                disabled={!!generating}
                onClick={() => generate(p.aspectRatio)}
                className="flex w-full items-center justify-between rounded-xl border border-surface-600 bg-surface-700/50 px-4 py-3 text-left transition hover:border-brand-500/50 hover:bg-surface-700 disabled:opacity-50"
              >
                <div>
                  <p className="text-sm font-medium text-white">{p.label}</p>
                  <p className="text-[10px] text-stone-500">{p.size} · {p.aspectRatio}</p>
                </div>
                {isGenerating ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                ) : (
                  <span className="text-xs text-stone-600">Generate →</span>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <p className="mt-3 text-[10px] text-stone-600">Each variant costs 2 credits.</p>
      </div>
    </div>
  );
}

// ─── Brand Lock Modal ─────────────────────────────────────────────────────────

function BrandLockModal({ brand, brandColors, onClose, onSaved }: {
  brand: Brand;
  brandColors: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [allowedColors, setAllowedColors] = useState<string[]>(brandColors.slice(0, 6));
  const [logoPosition, setLogoPosition] = useState<string>("top-right");
  const [ctaTone, setCtaTone] = useState<string>("soft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleColor(c: string) {
    setAllowedColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock",
          isBrandLockEnabled: enabled,
          designConstraints: enabled ? {
            allowedColors,
            lockedLogoPosition: logoPosition,
            ctaTone,
            logoRequired: true,
          } : {},
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save.");
      onSaved();
      onClose();
    } catch {
      setError("Failed to save brand lock settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-surface-600 bg-surface-800 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Brand Lock</h3>
            <p className="text-xs text-stone-500 mt-0.5">{brand.name} · design guardrails</p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-600 hover:text-white transition text-lg leading-none">×</button>
        </div>

        {/* Enable toggle */}
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`mb-5 flex w-full items-center justify-between rounded-xl border p-4 transition ${
            enabled ? "border-brand-500/50 bg-brand-500/10" : "border-surface-600 bg-surface-700/40"
          }`}
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Enable Brand Lock</p>
            <p className="text-xs text-stone-500">Enforce design rules on all generations</p>
          </div>
          <div className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-brand-500" : "bg-surface-600"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
        </button>

        {enabled && (
          <div className="space-y-5">
            {/* Allowed colors */}
            {brandColors.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-stone-400">Allowed colors</p>
                <div className="flex flex-wrap gap-2">
                  {brandColors.slice(0, 8).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleColor(c)}
                      title={c}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                        allowedColors.includes(c) ? "border-white" : "border-transparent opacity-40"
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {allowedColors.includes(c) && (
                        <span className="text-[10px] font-bold text-white drop-shadow">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Logo position */}
            <div>
              <p className="mb-2 text-xs font-semibold text-stone-400">Logo position</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setLogoPosition(pos)}
                    className={`rounded-lg border py-2 text-xs font-medium transition ${
                      logoPosition === pos ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500"
                    }`}
                  >
                    {pos.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA tone */}
            <div>
              <p className="mb-2 text-xs font-semibold text-stone-400">CTA tone</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: "soft", label: "Soft", example: "Learn more" },
                  { value: "assertive", label: "Assertive", example: "Get started" },
                  { value: "urgent", label: "Urgent", example: "Act now" },
                ] as const).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCtaTone(t.value)}
                    className={`flex flex-col items-center rounded-lg border py-2 px-1 transition ${
                      ctaTone === t.value ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500"
                    }`}
                  >
                    <span className="text-xs font-medium">{t.label}</span>
                    <span className="mt-0.5 text-[9px] opacity-60">{t.example}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, onDownload, onDelete, onResize }: {
  asset: Asset;
  onDownload: (a: Asset) => void;
  onDelete: (id: string) => void;
  onResize?: (a: Asset) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const canOpen = !!asset.brand?.siteUrl && asset.brand.siteUrl !== "https://logo-only.brandbloom.local";
  const openHref = canOpen
    ? `/analyze?url=${encodeURIComponent(asset.brand!.siteUrl)}&brandId=${asset.brand!.id}`
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-surface-700 bg-gradient-to-b from-surface-800 to-surface-800/90 ring-1 ring-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-surface-500 hover:shadow-xl hover:shadow-black/30">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-700">
        {asset.url && !imgError ? (
          <img src={asset.url} alt={asset.label}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            onError={() => setImgError(true)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <span className="text-3xl opacity-20">🖼</span>
            <span className="text-xs text-stone-600">Unavailable</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button type="button" onClick={() => onDownload(asset)} disabled={!asset.url || imgError}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-xs font-bold text-black hover:bg-stone-100 disabled:opacity-40">
            <IconDownload /> Download
          </button>
        </div>
        <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-1">
          {asset.type && (
            <span className="rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] capitalize text-stone-300 backdrop-blur-sm">
              {asset.type}
            </span>
          )}
          <span className="rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] tabular-nums text-stone-400 backdrop-blur-sm">
            {asset.width}×{asset.height}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <p className="truncate text-xs font-semibold text-white" title={asset.label}>{asset.label}</p>
        {asset.brand && <p className="truncate text-[11px] text-stone-500">{asset.brand.name}</p>}
        {asset.sourceIdea && <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-600">{asset.sourceIdea}</p>}

        <div className="mt-auto flex items-center gap-1.5 pt-2">
          {openHref ? (
            <Link href={openHref} title="Open brand"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-600 text-stone-500 transition hover:border-surface-500 hover:text-white">
              <IconOpen />
            </Link>
          ) : <div className="h-7 w-7 shrink-0" />}

          {asset.brand ? (
            <BrandKitDownload brandId={asset.brand.id} label="PDF"
              className="flex h-7 items-center justify-center rounded-lg border border-surface-600 px-2 text-[10px] text-stone-500 transition hover:border-surface-500 hover:text-white" />
          ) : <div className="h-7 shrink-0" />}

          <div className="flex-1" />

          {onResize && asset.brand && (
            <button type="button" onClick={() => onResize(asset)}
              className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-surface-600 px-2.5 text-[11px] font-medium text-stone-400 transition hover:border-surface-500 hover:text-white">
              Resize
            </button>
          )}

          <button type="button" onClick={() => onDownload(asset)} disabled={!asset.url || imgError}
            className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-brand-500/20 px-2.5 text-[11px] font-medium text-brand-300 transition hover:bg-brand-500/30 disabled:opacity-40">
            <IconDownload /> Save
          </button>

          <button type="button" onClick={() => onDelete(asset.id)} title="Delete"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/20">
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ghost card (while generating) ───────────────────────────────────────────

function GhostCard({ prompt }: { prompt: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-brand-500/30 bg-surface-800">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-700">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-brand-500/10 via-surface-700 to-brand-500/5" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <span className="px-4 text-center text-[11px] text-stone-500">Generating…</span>
        </div>
      </div>
      <div className="px-3 pb-3 pt-2.5">
        <p className="line-clamp-2 text-xs text-stone-500">{prompt}</p>
      </div>
    </div>
  );
}

// ─── Create Bar ───────────────────────────────────────────────────────────────

function CreateBar({ brands, selectedBrandId, onAssetCreated, onGenerating }: {
  brands: Brand[];
  selectedBrandId: string;
  onAssetCreated: (asset: Asset) => void;
  onGenerating: (prompt: string | null) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [brandId, setBrandId] = useState(selectedBrandId || brands[0]?.id || "");
  const [size, setSize] = useState("1024x1024");
  const [state, setState] = useState<GeneratingState>("idle");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync brand id when selection changes from sidebar
  useEffect(() => {
    if (selectedBrandId) setBrandId(selectedBrandId);
  }, [selectedBrandId]);

  useEffect(() => {
    if (!brandId && brands.length > 0) setBrandId(brands[0].id);
  }, [brands, brandId]);

  const sizeToAspectRatio: Record<string, string> = {
    "1024x1024": "1:1",
    "1024x1344": "3:4",
    "1344x768": "16:9",
    "1536x640": "21:9",
  };

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !brandId || state !== "idle") return;
    setError("");
    setState("planning");
    onGenerating(prompt.trim());

    try {
      const selectedBrand = brands.find((b) => b.id === brandId);
      const aspectRatio = sizeToAspectRatio[size] ?? "1:1";

      setState("generating");
      const res = await fetch("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          promptOverride: prompt.trim(),
          aspectRatio,
          quality: "4k",
          premiumIdeas: true,
          limit: 1,
          brandName: selectedBrand?.name,
          domain: selectedBrand?.domain,
        }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({})) as {
        assets?: Asset[];
        asset?: Asset;
        error?: string;
      };

      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed.");

      const newAsset = data.assets?.[0] ?? data.asset;
      if (newAsset) {
        onAssetCreated(newAsset);
        onGenerating(null);
        setState("done");
        setPrompt("");
        setTimeout(() => setState("idle"), 1500);
      } else {
        throw new Error("No asset returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      onGenerating(null);
      setState("idle");
    }
  }

  const isGenerating = state === "generating" || state === "planning";

  return (
    <form onSubmit={handleGenerate} className="rounded-2xl border border-surface-600 bg-surface-800/60 p-4 ring-1 ring-white/[0.04]">

      {/* Prompt */}
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(e); }
        }}
        placeholder='Describe what you need — e.g. "Instagram post for a summer sale with bold colours"'
        rows={2}
        disabled={isGenerating}
        className="w-full resize-none rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none disabled:opacity-50 leading-relaxed"
      />

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Brand picker */}
        {brands.length > 1 && (
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)}
            className="h-9 rounded-lg border border-surface-600 bg-surface-700 px-3 text-xs text-white focus:border-brand-500 focus:outline-none">
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        {/* Size chips */}
        <div className="flex gap-1">
          {SIZE_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setSize(opt.value)}
              className={`flex h-9 flex-col items-center justify-center rounded-lg border px-2.5 transition ${
                size === opt.value
                  ? "border-brand-500 bg-brand-500/10 text-brand-300"
                  : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"
              }`}>
              <span className="text-[10px] font-medium leading-none">{opt.label}</span>
              <span className="mt-0.5 text-[9px] leading-none text-stone-600">{opt.hint}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Generate button */}
        <button type="submit"
          disabled={isGenerating || !prompt.trim() || !brandId}
          className={`flex h-9 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition active:scale-[0.99] ${
            state === "done"
              ? "bg-green-500/20 text-green-300"
              : "bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400 disabled:opacity-50"
          }`}>
          {isGenerating
            ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />{state === "planning" ? "Planning…" : "Generating…"}</>
            : state === "done"
            ? "✓ Done!"
            : <><IconSparkle /> Generate</>
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {isGenerating && (
        <p className="mt-2 text-xs text-stone-600">Generating your asset — it'll appear below in ~15–30s.</p>
      )}
    </form>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ brands, selectedBrandId, onSelectBrand, onDeleteBrand, onImproveBrand, onOpenLock, assetCounts }: {
  brands: Brand[];
  selectedBrandId: string;
  onSelectBrand: (id: string) => void;
  onDeleteBrand: (id: string, name: string) => void;
  onImproveBrand: (id: string) => void;
  onOpenLock: (brandId: string) => void;
  assetCounts: Record<string, number>;
}) {
  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const selectedColors = selectedBrand ? parseColors(selectedBrand.colors) : [];

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-surface-700 bg-surface-900">
      <div className="flex-1 overflow-y-auto py-4">
        <div className="mb-2 px-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">Your Brands</p>
        </div>

        {/* Brand list */}
        <div className="space-y-0.5 px-2">
          {brands.map((brand) => {
            const isSelected = brand.id === selectedBrandId;
            const colors = parseColors(brand.colors);
            const count = assetCounts[brand.id] ?? brand._count?.assets ?? 0;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => onSelectBrand(brand.id)}
                className={`group/brand flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-all ${
                  isSelected
                    ? "bg-surface-700 ring-1 ring-white/8"
                    : "hover:bg-surface-800"
                }`}
              >
                {/* Logo / initial */}
                {brand.image && !brand.image.endsWith(".mp4") ? (
                  <Image src={brand.image} alt="" width={28} height={28} unoptimized
                    className="h-7 w-7 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                    style={{ background: colors[0] ?? "#ea751d" }}
                  >
                    {brand.name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-semibold ${isSelected ? "text-white" : "text-stone-400"}`}>
                    {brand.name}
                  </p>
                  <p className="truncate text-[10px] text-stone-600">
                    {count} asset{count !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Confidence dot */}
                {brand.extraction && (
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    brand.extraction.confidenceLabel === "high" ? "bg-green-400" :
                    brand.extraction.confidenceLabel === "medium" ? "bg-amber-400" :
                    "bg-red-400"
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Add brand */}
        <div className="mt-2 px-2">
          <Link href="/analyze"
            className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-xs text-stone-600 transition hover:bg-surface-800 hover:text-stone-400">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-surface-600">
              <IconPlus />
            </div>
            Add brand
          </Link>
        </div>
      </div>

      {/* Selected brand colors + actions */}
      {selectedBrand && (
        <div className="border-t border-surface-700 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">
            {selectedBrand.name}
          </p>

          {selectedColors.length > 0 && (
            <div className="mb-3 flex gap-1">
              {selectedColors.slice(0, 6).map((c, i) => (
                <span key={`${c}-${i}`} className="h-5 w-5 rounded-full border border-white/10" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <BrandKitDownload brandId={selectedBrand.id} label="PDF kit"
              className="flex h-7 flex-1 items-center justify-center rounded-lg border border-surface-600 text-[10px] text-stone-500 transition hover:border-surface-500 hover:text-white" />

            <button type="button" onClick={() => onOpenLock(selectedBrand.id)}
              className="flex h-7 items-center rounded-lg border border-surface-600 px-2 text-[10px] font-medium text-stone-500 transition hover:border-brand-500/50 hover:text-brand-300"
              title="Brand Lock settings">
              🔒 Lock
            </button>

            {selectedBrand.extraction && selectedBrand.extraction.confidenceLabel !== "high" && (
              <button type="button" onClick={() => onImproveBrand(selectedBrand.id)}
                className="flex h-7 items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 text-[10px] font-semibold text-amber-300 transition hover:bg-amber-500/20">
                Improve
              </button>
            )}

            <button type="button" onClick={() => onDeleteBrand(selectedBrand.id, selectedBrand.name)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
              title="Delete brand">
              <IconTrash />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    </main>
  );
}

// ─── Dashboard content ────────────────────────────────────────────────────────

function DashboardContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [improveStatus, setImproveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState<string | null>(null);
  const [resizingAsset, setResizingAsset] = useState<Asset | null>(null);
  const [lockModalBrandId, setLockModalBrandId] = useState<string | null>(null);

  const initialBrandId = searchParams?.get("brandId") ?? "";
  const [selectedBrandId, setSelectedBrandId] = useState<string>(initialBrandId);

  useEffect(() => {
    if (status === "authenticated") fetchData();
    else if (status === "unauthenticated") setLoading(false);
  }, [status]);

  // Set selected brand once brands load (from URL param or first brand)
  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  async function fetchData() {
    try {
      const [brandsRes, assetsRes] = await Promise.all([
        fetch("/api/brands", { credentials: "include" }),
        fetch("/api/assets", { credentials: "include" }),
      ]);
      if (brandsRes.status === 401 || assetsRes.status === 401) {
        window.location.href = "/login?callbackUrl=/dashboard";
        return;
      }
      if (brandsRes.ok) {
        const d = await brandsRes.json().catch(() => ({})) as { brands?: Brand[] };
        setBrands(d.brands ?? []);
      }
      if (assetsRes.ok) {
        const d = await assetsRes.json().catch(() => ({})) as { assets?: Asset[] };
        setAssets(d.assets ?? []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function deleteBrand(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its assets?`)) return;
    const res = await fetch(`/api/brands/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setBrands((p) => p.filter((b) => b.id !== id));
      setAssets((p) => p.filter((a) => a.brand?.id !== id));
      if (selectedBrandId === id) setSelectedBrandId("");
    } else {
      setDeleteError("Failed to delete brand.");
    }
  }

  async function improveBrandExtraction(id: string) {
    try {
      const previous = brands.find((b) => b.id === id);
      const previousLabel = previous?.extraction?.confidenceLabel;
      const res = await fetch(`/api/brands/${id}`, { method: "PATCH", credentials: "include" });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        brand?: { extraction?: { confidenceLabel?: "high" | "medium" | "low" } };
      };
      if (!res.ok) {
        const message = data.error ?? "Failed to improve extraction.";
        setDeleteError(message);
        setImproveStatus({ type: "error", message });
        return;
      }
      await fetchData();
      const nextLabel = data.brand?.extraction?.confidenceLabel;
      const titleCase = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
      const message =
        previousLabel && nextLabel
          ? `Extraction updated: ${titleCase(previousLabel)} → ${titleCase(nextLabel)} confidence.`
          : "Extraction improved.";
      setImproveStatus({ type: "success", message });
    } catch {
      const message = "Failed to improve extraction.";
      setDeleteError(message);
      setImproveStatus({ type: "error", message });
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset? You'll get 1 credit back.")) return;
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setAssets((p) => p.filter((a) => a.id !== id));
    else setDeleteError("Failed to delete asset.");
  }

  function downloadAsset(asset: Asset) {
    const a = document.createElement("a");
    a.href = asset.url;
    a.download = `${asset.label.replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function handleAssetCreated(asset: Asset) {
    setAssets((prev) => [asset, ...prev]);
  }

  // Asset counts per brand for sidebar display
  const assetCounts: Record<string, number> = {};
  for (const asset of assets) {
    if (asset.brand?.id) {
      assetCounts[asset.brand.id] = (assetCounts[asset.brand.id] ?? 0) + 1;
    }
  }

  // Filter assets by selected brand
  const filteredAssets = selectedBrandId
    ? assets.filter((a) => a.brand?.id === selectedBrandId)
    : assets;

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (status === "loading" || loading) return (
    <main className="min-h-screen">
      <Header />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    </main>
  );

  if (status === "unauthenticated") return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-lg px-4 pt-32 text-center">
        <h1 className="mb-4 text-2xl font-bold text-white">Sign in to continue</h1>
        <Link href="/login" className="inline-block rounded-xl bg-brand-500 px-6 py-3 font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 active:scale-[0.99]">Sign in</Link>
      </div>
    </main>
  );

  if (!loading && brands.length === 0) return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-lg px-4 pb-24 pt-32 text-center">
        <div className="mb-6 text-5xl">🌱</div>
        <h1 className="mb-3 text-3xl font-bold text-white">Add your first brand</h1>
        <p className="mb-8 text-stone-400">Enter your website URL and BrandBloom will learn your brand identity in seconds.</p>
        <Link href="/analyze" className="inline-block rounded-xl bg-brand-500 px-8 py-3 font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 active:scale-[0.99]">
          Get started →
        </Link>
      </div>
    </main>
  );

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <main className="flex min-h-screen flex-col bg-surface-900">
      <Header />

      {/* Modals */}
      {resizingAsset && (
        <VariantModal
          asset={resizingAsset}
          onClose={() => setResizingAsset(null)}
          onVariantCreated={(a) => { setAssets((prev) => [a, ...prev]); setResizingAsset(null); }}
        />
      )}
      {lockModalBrandId && (() => {
        const b = brands.find((x) => x.id === lockModalBrandId);
        if (!b) return null;
        return (
          <BrandLockModal
            brand={b}
            brandColors={parseColors(b.colors)}
            onClose={() => setLockModalBrandId(null)}
            onSaved={() => { fetchData(); setLockModalBrandId(null); }}
          />
        );
      })()}

      {/* Body — sidebar + main */}
      <div className="flex flex-1 pt-16">

        {/* Sidebar — desktop only */}
        <div className="hidden lg:flex">
          <Sidebar
            brands={brands}
            selectedBrandId={selectedBrandId}
            onSelectBrand={setSelectedBrandId}
            onDeleteBrand={deleteBrand}
            onImproveBrand={improveBrandExtraction}
            onOpenLock={setLockModalBrandId}
            assetCounts={assetCounts}
          />
        </div>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">

            {/* Mobile brand pills */}
            {brands.length > 0 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedBrandId("")}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    !selectedBrandId ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500"
                  }`}
                >
                  All
                </button>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrandId(b.id)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      selectedBrandId === b.id ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* Page header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">
                  {session?.user?.name ? `Hey, ${session.user.name.split(" ")[0]}` : "Dashboard"}
                </h1>
                <p className="mt-0.5 text-sm text-stone-500">
                  {selectedBrandId
                    ? `${filteredAssets.length} asset${filteredAssets.length !== 1 ? "s" : ""} · ${brands.find(b => b.id === selectedBrandId)?.name ?? ""}`
                    : `${brands.length} brand${brands.length !== 1 ? "s" : ""} · ${assets.length} asset${assets.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <Link href="/campaigns"
                className="rounded-xl border border-surface-600 px-4 py-2 text-sm font-medium text-stone-400 transition hover:border-surface-500 hover:bg-surface-800/60 hover:text-white active:scale-[0.99]">
                ⚡ Campaigns
              </Link>
            </div>

            {/* Status messages */}
            {deleteError && (
              <div className="mb-5 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {deleteError}
                <button onClick={() => setDeleteError(null)} className="ml-3 text-red-400 hover:text-red-300">×</button>
              </div>
            )}
            {improveStatus && (
              <div className={`mb-5 flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                improveStatus.type === "success"
                  ? "border border-green-500/30 bg-green-500/10 text-green-300"
                  : "border border-red-500/30 bg-red-500/10 text-red-300"
              }`}>
                {improveStatus.message}
                <button onClick={() => setImproveStatus(null)} className="ml-3">×</button>
              </div>
            )}

            {/* Generate bar */}
            <div className="mb-8">
              <CreateBar
                brands={brands}
                selectedBrandId={selectedBrandId}
                onAssetCreated={handleAssetCreated}
                onGenerating={setGeneratingPrompt}
              />
            </div>

            {/* Assets section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Assets
                  {filteredAssets.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-stone-500">{filteredAssets.length}</span>
                  )}
                </p>
              </div>

              {filteredAssets.length === 0 && !generatingPrompt ? (
                <div className="rounded-2xl border border-dashed border-surface-700 p-16 text-center">
                  <p className="text-sm text-stone-600">
                    {selectedBrandId
                      ? "No assets yet for this brand. Describe what you need above."
                      : "Describe what you need above and hit Generate."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {generatingPrompt && <GhostCard prompt={generatingPrompt} />}
                  {filteredAssets.map((a) => (
                    <AssetCard key={a.id} asset={a} onDownload={downloadAsset} onDelete={deleteAsset} onResize={setResizingAsset} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

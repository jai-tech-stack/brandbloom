"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Asset {
  id: string;
  url: string | null;
  finalImageUrl: string | null;
  label: string;
  type: string;
  width: number;
  height: number;
  aspectRatio: string | null;
  createdAt: string;
  brandId: string | null;
  prompt: string | null;
  status: string;
}

interface Brand {
  id: string;
  name: string;
  image: string | null;
  primaryColor: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  social: "Social Post",
  ad: "Advertisement",
  banner: "Banner",
  thumbnail: "Thumbnail",
  story: "Story",
  email: "Email Header",
};

const TYPE_OPTIONS = ["all", "social", "ad", "banner", "thumbnail", "story", "email"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function downloadImage(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener";
  a.click();
}

interface AssetsPanelProps {
  brands: Brand[];
}

export function AssetsPanel({ brands }: AssetsPanelProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBrand !== "all") params.set("brandId", filterBrand);
      if (filterType !== "all") params.set("type", filterType);
      params.set("limit", "48");
      const res = await fetch(`/api/assets?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { assets?: Asset[] };
        setAssets(data.assets ?? []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [filterBrand, filterType]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  async function deleteAsset(id: string) {
    setDeleting(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
      } else {
        setDeleteError("Failed to delete. Please try again.");
      }
    } catch {
      setDeleteError("Failed to delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  function generateMoreLikeThis(asset: Asset) {
    // Navigate to analyze/create with this brand pre-selected and the asset's prompt as starting point
    const params = new URLSearchParams();
    if (asset.brandId) params.set("brandId", asset.brandId);
    if (asset.prompt) params.set("prompt", asset.prompt);
    if (asset.type) params.set("type", asset.type);
    router.push(`/analyze?${params}&stage=create`);
  }

  const visibleAssets = assets.filter((a) => {
    const imgUrl = a.finalImageUrl ?? a.url;
    return !!imgUrl && a.status === "complete";
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Brand filter */}
        {brands.length > 1 && (
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="rounded-xl border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${filterType === t ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"}`}
            >
              {t === "all" ? "All types" : TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-stone-600">{visibleAssets.length} asset{visibleAssets.length !== 1 ? "s" : ""}</span>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{deleteError}</div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-surface-700" />
          ))}
        </div>
      ) : visibleAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl">🎨</div>
          <p className="font-semibold text-white">No assets yet</p>
          <p className="mt-1 text-sm text-stone-500">
            {filterBrand !== "all" || filterType !== "all"
              ? "No assets match your filters."
              : "Generate your first on-brand asset to see it here."}
          </p>
          <Link href="/analyze" className="mt-4 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-400">
            Generate assets →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAssets.map((asset) => {
            const imgUrl = asset.finalImageUrl ?? asset.url ?? "";
            const brand = brands.find((b) => b.id === asset.brandId);
            const isDeleting = deleting === asset.id;

            return (
              <div key={asset.id} className="group relative overflow-hidden rounded-2xl border border-surface-600 bg-surface-800">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-surface-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={asset.label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => downloadImage(imgUrl, `${asset.label.replace(/\s+/g, "-").toLowerCase()}.png`)}
                      className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-stone-100 transition"
                    >
                      ⬇ Download
                    </button>
                    <button
                      type="button"
                      onClick={() => generateMoreLikeThis(asset)}
                      className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                    >
                      ✨ More like this
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAsset(asset.id)}
                      disabled={isDeleting}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>

                  {/* Size badge */}
                  <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] text-stone-400 backdrop-blur">
                    {asset.width}×{asset.height}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{asset.label}</p>
                      <p className="text-[10px] text-stone-600">
                        {brand?.name && <span className="text-stone-500">{brand.name} · </span>}
                        {TYPE_LABELS[asset.type] ?? asset.type} · {formatDate(asset.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadImage(imgUrl, `${asset.label.replace(/\s+/g, "-").toLowerCase()}.png`)}
                      className="shrink-0 rounded-lg border border-surface-500 p-1.5 text-stone-500 opacity-0 transition group-hover:opacity-100 hover:text-white"
                      title="Download"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {visibleAssets.length >= 48 && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => fetchAssets()}
            className="rounded-xl border border-surface-500 px-5 py-2.5 text-sm text-stone-400 hover:text-white transition"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
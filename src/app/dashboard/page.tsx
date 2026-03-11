"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";

type Brand = {
  id: string;
  name: string;
  domain: string;
  siteUrl: string;
  colors: string[] | string;
  image: string | null;
  createdAt: string;
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
  aspectRatio?: string | null;
  sourceIdea?: string | null;
  createdAt: string;
  brand?: { id: string; name: string; domain: string; siteUrl: string } | null;
};

function parseColors(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onDownload,
  onDelete,
}: {
  asset: Asset;
  onDownload: (a: Asset) => void;
  onDelete: (id: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const imgUrl = asset.url || "";
  const hasBrand = !!asset.brand;
  const brandKitUrl = hasBrand ? `/api/brand-kit-pdf?brandId=${asset.brand!.id}` : null;

  // Determine display aspect ratio from actual asset dimensions
  const isWide = asset.width > asset.height * 1.2;
  const isTall = asset.height > asset.width * 1.2;
  const aspectClass = isWide ? "aspect-video" : isTall ? "aspect-[3/4]" : "aspect-square";

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-surface-600 bg-surface-800 transition-all duration-200 hover:border-surface-500 hover:shadow-lg hover:shadow-black/30"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div className={`relative w-full ${aspectClass} overflow-hidden bg-surface-700`}>
        {imgUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={asset.label}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-2xl opacity-30">🖼</span>
            <span className="text-xs text-stone-600">Image unavailable</span>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={() => onDownload(asset)}
            disabled={!imgUrl || imgError}
            className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-stone-100 disabled:opacity-40"
          >
            ⬇ Download
          </button>
          {hasBrand && asset.brand!.siteUrl && asset.brand!.siteUrl !== "https://logo-only.brandbloom.local" && (
            <Link
              href={`/analyze?url=${encodeURIComponent(asset.brand!.siteUrl)}&stage=assets&brandId=${asset.brand!.id}${asset.prompt ? `&prompt=${encodeURIComponent(asset.prompt)}` : ""}`}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Open
            </Link>
          )}
        </div>

        {/* Dimensions badge */}
        <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] tabular-nums text-stone-400 backdrop-blur">
          {asset.width}×{asset.height}
        </div>

        {/* Type badge */}
        {asset.type && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] capitalize text-stone-400 backdrop-blur">
            {asset.type}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Label */}
        <p className="truncate text-xs font-semibold leading-snug text-white" title={asset.label}>
          {asset.label}
        </p>

        {/* Brand name */}
        {asset.brand && (
          <p className="truncate text-[11px] text-stone-500" title={asset.brand.name}>
            {asset.brand.name}
          </p>
        )}

        {/* Source idea if exists */}
        {asset.sourceIdea && (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-stone-600" title={asset.sourceIdea}>
            {asset.sourceIdea}
          </p>
        )}

        {/* Action row — always the same structure */}
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          {/* Brand Kit PDF — always takes same space, hidden if no brand */}
          {brandKitUrl ? (
            <a
              href={brandKitUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Download Brand Kit PDF"
              className="flex h-7 items-center gap-1 rounded-lg border border-surface-600 px-2 text-[11px] text-stone-500 transition hover:border-surface-500 hover:text-white"
            >
              <span>PDF</span>
            </a>
          ) : (
            <div className="h-7 w-[42px]" /> // spacer to maintain alignment
          )}

          <div className="flex-1" />

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(asset.id)}
            title="Delete (refunds 1 credit)"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-sm text-red-400 transition hover:bg-red-500/20"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Brand Card ───────────────────────────────────────────────────────────────

function BrandCard({
  brand,
  onDelete,
}: {
  brand: Brand;
  onDelete: (id: string, name: string) => void;
}) {
  const colors = parseColors(brand.colors);
  const generateHref =
    brand.siteUrl && brand.siteUrl !== "https://logo-only.brandbloom.local"
      ? `/analyze?url=${encodeURIComponent(brand.siteUrl)}&stage=create&brandId=${brand.id}`
      : `/analyze?brandId=${brand.id}&stage=create`;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-surface-600 bg-surface-800 p-5 transition hover:border-surface-500">
      {/* Header */}
      <div className="flex items-start gap-3">
        {brand.image && !brand.image.endsWith(".mp4") ? (
          <Image
            src={brand.image}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-base font-bold text-brand-400">
            {brand.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-sm font-semibold text-white">{brand.name}</h3>
          <p className="truncate text-xs text-stone-500">{brand.domain}</p>
        </div>
      </div>

      {/* Color swatches */}
      {colors.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {colors.slice(0, 6).map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="h-4 w-4 rounded-full border border-white/10 shadow-sm"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] text-stone-600">
          {brand._count?.assets ?? 0} asset{brand._count?.assets !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Brand Kit PDF */}
          <a
            href={`/api/brand-kit-pdf?brandId=${brand.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-surface-600 px-2.5 py-1.5 text-[11px] text-stone-500 transition hover:border-surface-500 hover:text-white"
            title="Download Brand Kit PDF"
          >
            ⬇ PDF
          </a>
          <Link
            href={generateHref}
            className="rounded-lg bg-brand-500/20 px-2.5 py-1.5 text-[11px] font-medium text-brand-300 transition hover:bg-brand-500/30"
          >
            Generate
          </Link>
          <button
            type="button"
            onClick={() => onDelete(brand.id, brand.name)}
            className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"brands" | "assets">("brands");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") fetchData();
    else if (status === "unauthenticated") setLoading(false);
  }, [status]);

  async function fetchData() {
    try {
      const [brandsRes, assetsRes] = await Promise.all([
        fetch("/api/brands", { credentials: "include" }),
        fetch("/api/assets", { credentials: "include" }),
      ]);
      if (brandsRes.status === 401 || assetsRes.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/dashboard");
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
    } catch (err) {
      console.error("fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBrand(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its assets? This cannot be undone.`)) return;
    setDeleteError(null);
    const res = await fetch(`/api/brands/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setBrands((p) => p.filter((b) => b.id !== id));
      setAssets((p) => p.filter((a) => a.brand?.id !== id));
    } else {
      setDeleteError("Failed to delete brand. Please try again.");
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset? You'll get 1 credit back.")) return;
    setDeleteError(null);
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setAssets((p) => p.filter((a) => a.id !== id));
      const me = await fetch("/api/me", { credentials: "include" }).then((r) => r.json()).catch(() => null) as { user?: { credits?: number } } | null;
      if (me?.user?.credits !== undefined) {
        window.dispatchEvent(new CustomEvent("credits-updated", { detail: me.user.credits }));
      }
    } else {
      setDeleteError("Failed to delete asset. Please try again.");
    }
  }

  function downloadAsset(asset: Asset) {
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = `${asset.label.replace(/\s+/g, "-").toLowerCase()}-${asset.width}x${asset.height}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const assetTypes = [...new Set(assets.map((a) => a.type).filter(Boolean))];

  const filteredAssets = assets.filter((asset) => {
    const matchesType = assetTypeFilter === "all" || asset.type === assetTypeFilter;
    const q = assetSearch.trim().toLowerCase();
    if (!q) return matchesType;
    const text = [asset.label, asset.type, asset.brand?.name, asset.sourceIdea].filter(Boolean).join(" ").toLowerCase();
    return matchesType && text.includes(q);
  });

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-lg px-4 pt-32 pb-24 text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">Sign in to access your dashboard</h1>
          <p className="mb-8 text-stone-400">Manage your brands and generated assets in one place.</p>
          <Link href="/login" className="inline-block rounded-xl bg-brand-500 px-6 py-3 font-medium text-white hover:bg-brand-400">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-24">

        {/* Page header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-stone-400">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/campaign"
              className="rounded-xl border border-surface-500 px-5 py-2.5 text-sm font-medium text-white transition hover:border-brand-500 hover:bg-surface-800"
            >
              Campaign
            </Link>
            <Link
              href="/analyze"
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
            >
              + New Brand
            </Link>
          </div>
        </div>

        {deleteError && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="ml-3 text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 flex gap-6 border-b border-surface-600">
          {(["brands", "assets"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? "border-b-2 border-brand-500 text-white"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {tab} ({tab === "brands" ? brands.length : assets.length})
            </button>
          ))}
        </div>

        {/* ── Brands Tab ── */}
        {activeTab === "brands" && (
          brands.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-600 p-12 text-center">
              <p className="text-stone-500">No brands yet.</p>
              <Link href="/analyze" className="mt-3 inline-block text-sm text-brand-400 hover:text-brand-300">
                Analyze your first website →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} onDelete={deleteBrand} />
              ))}
            </div>
          )
        )}

        {/* ── Assets Tab ── */}
        {activeTab === "assets" && (
          <>
            {/* Filters */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Search assets…"
                className="flex-1 rounded-xl border border-surface-600 bg-surface-800 px-4 py-2.5 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
              />
              <select
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value)}
                className="rounded-xl border border-surface-600 bg-surface-800 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="all">All types</option>
                {assetTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {filteredAssets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-600 p-12 text-center">
                <p className="text-stone-500">
                  {assetSearch || assetTypeFilter !== "all"
                    ? "No assets match your filters."
                    : "No assets yet. Generate some from a brand or campaign."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onDownload={downloadAsset}
                    onDelete={deleteAsset}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
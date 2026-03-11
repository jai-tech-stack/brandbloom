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

const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconOpen = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const IconPDF = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);

function AssetCard({ asset, onDownload, onDelete }: {
  asset: Asset;
  onDownload: (a: Asset) => void;
  onDelete: (id: string) => void;
}) {
  const [imgError, setImgError] = useState(false);

  const canOpen = !!asset.brand?.siteUrl &&
    asset.brand.siteUrl !== "https://logo-only.brandbloom.local";

  const openHref = canOpen
    ? `/analyze?url=${encodeURIComponent(asset.brand!.siteUrl)}&stage=assets&brandId=${asset.brand!.id}${asset.prompt ? `&prompt=${encodeURIComponent(asset.prompt)}` : ""}`
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-800 transition-all duration-150 hover:border-surface-500 hover:shadow-xl hover:shadow-black/30">
      {/* Image — fixed square for all cards */}
      <div className="relative aspect-square w-full overflow-hidden bg-surface-700">
        {asset.url && !imgError ? (
          <img
            src={asset.url}
            alt={asset.label}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <span className="text-3xl opacity-20">🖼</span>
            <span className="text-xs text-stone-600">Image unavailable</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onDownload(asset)}
            disabled={!asset.url || imgError}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-xs font-bold text-black transition hover:bg-stone-100 disabled:opacity-40"
          >
            <IconDownload /> Download
          </button>
        </div>

        {/* Top-right badges */}
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

      {/* Info + actions */}
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <p className="truncate text-xs font-semibold text-white" title={asset.label}>
          {asset.label}
        </p>
        {asset.brand && (
          <p className="truncate text-[11px] text-stone-500">{asset.brand.name}</p>
        )}
        {asset.sourceIdea && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-600">
            {asset.sourceIdea}
          </p>
        )}

        {/* Action row — 4 fixed slots, never wraps */}
        <div className="mt-auto flex items-center gap-1.5 pt-2">
          {/* Slot 1: Open */}
          {openHref ? (
            <Link href={openHref} title="Open in editor"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-600 text-stone-500 transition hover:border-surface-500 hover:text-white">
              <IconOpen />
            </Link>
          ) : (
            <div className="h-7 w-7 shrink-0" />
          )}

          {/* Slot 2: PDF */}
          {asset.brand ? (
            <a href={`/api/brand-kit-pdf?brandId=${asset.brand.id}`}
              target="_blank" rel="noopener noreferrer" title="Brand Kit PDF"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-600 text-stone-500 transition hover:border-surface-500 hover:text-white">
              <IconPDF />
            </a>
          ) : (
            <div className="h-7 w-7 shrink-0" />
          )}

          <div className="flex-1" />

          {/* Slot 3: Save */}
          <button type="button" onClick={() => onDownload(asset)}
            disabled={!asset.url || imgError}
            className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-brand-500/20 px-2.5 text-[11px] font-medium text-brand-300 transition hover:bg-brand-500/30 disabled:opacity-40">
            <IconDownload /> Save
          </button>

          {/* Slot 4: Delete */}
          <button type="button" onClick={() => onDelete(asset.id)}
            title="Delete (refunds 1 credit)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/20">
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandCard({ brand, onDelete }: {
  brand: Brand;
  onDelete: (id: string, name: string) => void;
}) {
  const colors = parseColors(brand.colors);
  const generateHref = brand.siteUrl && brand.siteUrl !== "https://logo-only.brandbloom.local"
    ? `/analyze?url=${encodeURIComponent(brand.siteUrl)}&stage=create&brandId=${brand.id}`
    : `/analyze?brandId=${brand.id}&stage=create`;

  return (
    <div className="flex flex-col rounded-2xl border border-surface-700 bg-surface-800 p-5 transition hover:border-surface-500">
      <div className="flex items-start gap-3">
        {brand.image && !brand.image.endsWith(".mp4") ? (
          <Image src={brand.image} alt="" width={44} height={44} unoptimized
            className="h-11 w-11 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-base font-bold text-brand-400">
            {brand.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-sm font-semibold text-white">{brand.name}</h3>
          <p className="truncate text-xs text-stone-500">{brand.domain}</p>
        </div>
      </div>

      {colors.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {colors.slice(0, 6).map((c, i) => (
            <span key={`${c}-${i}`} className="h-4 w-4 rounded-full border border-white/10"
              style={{ backgroundColor: c }} title={c} />
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        <p className="mb-2.5 text-[11px] text-stone-600">
          {brand._count?.assets ?? 0} asset{brand._count?.assets !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <a href={`/api/brand-kit-pdf?brandId=${brand.id}`}
            target="_blank" rel="noopener noreferrer" title="Brand Kit PDF"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-surface-600 px-2.5 text-[11px] text-stone-500 transition hover:border-surface-500 hover:text-white">
            <IconPDF /> PDF
          </a>
          <Link href={generateHref}
            className="flex h-8 flex-1 items-center justify-center rounded-lg bg-brand-500/20 text-[11px] font-semibold text-brand-300 transition hover:bg-brand-500/30">
            Generate →
          </Link>
          <button type="button" onClick={() => onDelete(brand.id, brand.name)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
            title="Delete brand">
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

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
      console.error("fetchData:", err);
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
      setDeleteError("Failed to delete brand.");
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset? You'll get 1 credit back.")) return;
    setDeleteError(null);
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setAssets((p) => p.filter((a) => a.id !== id));
      const me = await fetch("/api/me", { credentials: "include" })
        .then((r) => r.json()).catch(() => null) as { user?: { credits?: number } } | null;
      if (me?.user?.credits !== undefined)
        window.dispatchEvent(new CustomEvent("credits-updated", { detail: me.user.credits }));
    } else {
      setDeleteError("Failed to delete asset.");
    }
  }

  function downloadAsset(asset: Asset) {
    const a = document.createElement("a");
    a.href = asset.url;
    a.download = `${asset.label.replace(/\s+/g, "-").toLowerCase()}-${asset.width}x${asset.height}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const assetTypes = [...new Set(assets.map((a) => a.type).filter(Boolean))];

  const filteredAssets = assets.filter((asset) => {
    const matchesType = assetTypeFilter === "all" || asset.type === assetTypeFilter;
    const q = assetSearch.trim().toLowerCase();
    if (!q) return matchesType;
    const text = [asset.label, asset.type, asset.brand?.name, asset.sourceIdea]
      .filter(Boolean).join(" ").toLowerCase();
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
          <h1 className="mb-4 text-2xl font-bold text-white">Sign in to view your dashboard</h1>
          <p className="mb-8 text-stone-400">Manage your brands and generated assets.</p>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-stone-400">Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/campaign"
              className="rounded-xl border border-surface-600 px-5 py-2.5 text-sm font-medium text-white transition hover:border-brand-500/50 hover:bg-surface-800">
              Campaign
            </Link>
            <Link href="/analyze"
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400">
              + New Brand
            </Link>
          </div>
        </div>

        {deleteError && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {deleteError}
            <button onClick={() => setDeleteError(null)} className="ml-3 text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        <div className="mb-8 flex gap-6 border-b border-surface-700">
          {(["brands", "assets"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition ${
                activeTab === tab ? "border-b-2 border-brand-500 text-white" : "text-stone-500 hover:text-stone-300"
              }`}>
              {tab} ({tab === "brands" ? brands.length : assets.length})
            </button>
          ))}
        </div>

        {activeTab === "brands" && (
          brands.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-700 p-16 text-center">
              <p className="text-stone-500">No brands yet.</p>
              <Link href="/analyze" className="mt-3 inline-block text-sm text-brand-400 hover:text-brand-300">
                Analyze your first website →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b) => <BrandCard key={b.id} brand={b} onDelete={deleteBrand} />)}
            </div>
          )
        )}

        {activeTab === "assets" && (
          <>
            <div className="mb-5 flex gap-3">
              <input type="text" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Search assets…"
                className="flex-1 rounded-xl border border-surface-700 bg-surface-800 px-4 py-2.5 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none" />
              <select value={assetTypeFilter} onChange={(e) => setAssetTypeFilter(e.target.value)}
                className="rounded-xl border border-surface-700 bg-surface-800 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none">
                <option value="all">All types</option>
                {assetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {filteredAssets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-700 p-16 text-center">
                <p className="text-stone-500">
                  {assetSearch || assetTypeFilter !== "all"
                    ? "No assets match your filters."
                    : "No assets yet. Generate some from a brand or campaign."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAssets.map((a) => (
                  <AssetCard key={a.id} asset={a} onDownload={downloadAsset} onDelete={deleteAsset} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
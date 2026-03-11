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

/** Safely parse colors regardless of whether they come as string or array */
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
    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
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
        const brandsData = await brandsRes.json().catch(() => ({})) as { brands?: Brand[] };
        setBrands(brandsData.brands || []);
      }
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json().catch(() => ({})) as { assets?: Asset[] };
        setAssets(assetsData.assets || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBrand(id: string, brandName: string) {
    if (!confirm(`Delete "${brandName}" and all its assets? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/brands/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setBrands((prev) => prev.filter((b) => b.id !== id));
        setAssets((prev) => prev.filter((a) => a.brand?.id !== id));
      } else {
        setDeleteError("Failed to delete brand. Please try again.");
      }
    } catch (err) {
      console.error("Failed to delete brand:", err);
      setDeleteError("Failed to delete brand. Please try again.");
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset? You'll get 1 credit back.")) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        // Refresh credits
        const me = await fetch("/api/me", { credentials: "include" }).then((r) => r.json()).catch(() => null) as { user?: { credits?: number } } | null;
        if (me?.user?.credits !== undefined) {
          window.dispatchEvent(new CustomEvent("credits-updated", { detail: me.user.credits }));
        }
      } else {
        setDeleteError("Failed to delete asset. Please try again.");
      }
    } catch (err) {
      console.error("Failed to delete asset:", err);
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
          <Link href="/login" className="inline-block rounded-xl bg-brand-500 px-6 py-3 font-medium text-white hover:bg-brand-400">Sign in</Link>
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
            <Link href="/campaign" className="rounded-xl border border-surface-500 px-5 py-2.5 font-medium text-white hover:border-brand-500 hover:bg-surface-800">
              Campaign
            </Link>
            <Link href="/" className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-400">
              + New Brand
            </Link>
          </div>
        </div>

        {deleteError && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {deleteError}
            <button onClick={() => setDeleteError(null)} className="ml-2 text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 flex gap-4 border-b border-surface-600">
          <button type="button" onClick={() => setActiveTab("brands")} className={`pb-4 text-sm font-medium transition ${activeTab === "brands" ? "border-b-2 border-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>
            Brands ({brands.length})
          </button>
          <button type="button" onClick={() => setActiveTab("assets")} className={`pb-4 text-sm font-medium transition ${activeTab === "assets" ? "border-b-2 border-brand-500 text-white" : "text-stone-400 hover:text-white"}`}>
            Assets ({assets.length})
          </button>
        </div>

        {/* Brands Tab */}
        {activeTab === "brands" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.length === 0 ? (
              <div className="col-span-full rounded-xl border border-surface-600 bg-surface-800/50 p-8 text-center">
                <p className="text-stone-400">No brands yet. Add your first brand by analyzing your website.</p>
                <Link href="/" className="mt-4 inline-block text-brand-400 hover:text-brand-300">Analyze your website →</Link>
              </div>
            ) : (
              brands.map((brand) => {
                const colors = parseColors(brand.colors);
                return (
                  <div key={brand.id} className="group relative rounded-xl border border-surface-600 bg-surface-800/50 p-6 transition hover:border-brand-500/50">
                    <div className="flex items-start gap-4">
                      {brand.image && !brand.image.endsWith(".mp4") ? (
                        <Image src={brand.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500/20 text-lg font-bold text-brand-400 flex-shrink-0">
                          {brand.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-white">{brand.name}</h3>
                        <p className="text-sm text-stone-400 truncate">{brand.domain}</p>
                      </div>
                    </div>
                    {colors.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {colors.slice(0, 5).map((c: string, i: number) => (
                          <span key={`${c}-${i}`} className="h-5 w-5 rounded-full border border-surface-500" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-stone-500">{brand._count?.assets || 0} asset{brand._count?.assets !== 1 ? "s" : ""}</span>
                      <div className="flex gap-2">
                        <Link
                          href={brand.siteUrl && brand.siteUrl !== "https://logo-only.brandbloom.local"
                            ? `/analyze?url=${encodeURIComponent(brand.siteUrl)}&stage=create&brandId=${brand.id}`
                            : `/analyze?brandId=${brand.id}&stage=create`
                          }
                          className="rounded-lg bg-brand-500/20 px-3 py-1.5 text-xs font-medium text-brand-300 hover:bg-brand-500/30"
                        >
                          Generate
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteBrand(brand.id, brand.name)}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === "assets" && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Search assets…"
                className="flex-1 rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
              <select
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value)}
                className="rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white"
              >
                <option value="all">All types</option>
                <option value="social">Social</option>
                <option value="ad">Ad</option>
                <option value="thumbnail">Thumbnail</option>
                <option value="banner">Banner</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAssets.length === 0 ? (
                <div className="col-span-full rounded-xl border border-surface-600 bg-surface-800/50 p-8 text-center">
                  <p className="text-stone-400">
                    {assetSearch || assetTypeFilter !== "all"
                      ? "No assets match your filters."
                      : "No assets yet. Generate some from a brand or campaign."}
                  </p>
                </div>
              ) : (
                filteredAssets.map((asset) => (
                  <div key={asset.id} className="group relative overflow-hidden rounded-xl border border-surface-600 bg-surface-800/50 transition hover:border-brand-500/50">
                    <div className="relative aspect-video w-full bg-surface-700">
                      {asset.url ? (
                        <Image src={asset.url} alt={asset.label} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-sm text-stone-500">Generation failed</div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="truncate font-medium text-white">{asset.label}</p>
                      <p className="text-xs text-stone-500">{asset.width}×{asset.height}</p>
                      {asset.brand && <p className="mt-0.5 text-xs text-stone-400 truncate">{asset.brand.name}</p>}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => downloadAsset(asset)}
                          disabled={!asset.url}
                          className="flex-1 rounded-lg bg-brand-500/20 py-2 text-xs font-medium text-brand-300 hover:bg-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Download
                        </button>
                        {asset.brand?.siteUrl && asset.brand.siteUrl !== "https://logo-only.brandbloom.local" && (
                          <Link
                            href={`/analyze?url=${encodeURIComponent(asset.brand.siteUrl)}&stage=assets&brandId=${asset.brand.id}${asset.prompt ? `&prompt=${encodeURIComponent(asset.prompt)}` : ""}`}
                            className="rounded-lg bg-surface-600 px-3 py-2 text-xs font-medium text-white hover:bg-surface-500"
                          >
                            Open
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteAsset(asset.id)}
                          className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20"
                          title="Delete (refunds 1 credit)"
                        >
                          ×
                        </button>
                        {asset.brand && (
                          <a
                            href={`/api/brand-kit-pdf?brandId=${asset.brand.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-surface-600 px-3 py-2 text-xs text-stone-400 transition hover:border-surface-500 hover:text-white"
                          >
                            ⬇ Brand Kit PDF
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
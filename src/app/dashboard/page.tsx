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
  colors: string[];
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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"brands" | "assets">("brands");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");

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
        const brandsData = await brandsRes.json();
        setBrands(brandsData.brands || []);
      }
      
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(assetsData.assets || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBrand(id: string) {
    if (!confirm("Delete this brand and all its assets?")) return;
    try {
      const res = await fetch(`/api/brands/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setBrands(brands.filter((b) => b.id !== id));
        setAssets(assets.filter((a) => a.brand?.name !== brands.find(b => b.id === id)?.name));
      }
    } catch (err) {
      console.error("Failed to delete brand:", err);
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset?")) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setAssets(assets.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete asset:", err);
    }
  }

  function downloadAsset(asset: Asset) {
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = `${asset.label.replace(/\s+/g, "-").toLowerCase()}-${asset.width}x${asset.height}.png`;
    link.click();
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
            <p className="text-stone-400">Manage your brands and assets</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/campaign"
              className="rounded-xl border border-surface-500 px-6 py-3 font-semibold text-white hover:border-brand-500 hover:bg-surface-800"
            >
              Generate Campaign
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-400"
            >
              + New Brand
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-4 border-b border-surface-600">
          <button
            type="button"
            onClick={() => setActiveTab("brands")}
            className={`pb-4 text-sm font-medium transition ${activeTab === "brands" ? "border-b-2 border-brand-500 text-white" : "text-stone-400 hover:text-white"}`}
          >
            Brands ({brands.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("assets")}
            className={`pb-4 text-sm font-medium transition ${activeTab === "assets" ? "border-b-2 border-brand-500 text-white" : "text-stone-400 hover:text-white"}`}
          >
            Assets ({assets.length})
          </button>
        </div>

        {/* Brands Tab */}
        {activeTab === "brands" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.length === 0 ? (
              <div className="col-span-full rounded-xl border border-surface-600 bg-surface-800/50 p-8 text-center">
                <p className="text-stone-400">No brands yet. Start by analyzing a website!</p>
                <Link href="/" className="mt-4 inline-block text-brand-400 hover:text-brand-300">
                  Analyze your first brand →
                </Link>
              </div>
            ) : (
              brands.map((brand) => (
                <div key={brand.id} className="group relative rounded-xl border border-surface-600 bg-surface-800/50 p-6 transition hover:border-brand-500/50">
                  <div className="flex items-start gap-4">
                    {brand.image && !brand.image.endsWith(".mp4") ? (
                      <Image src={brand.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500/20 text-lg font-bold text-brand-400">
                        {brand.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-white">{brand.name}</h3>
                      <p className="text-sm text-stone-400">{brand.domain}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(typeof brand.colors === 'string' ? JSON.parse(brand.colors) : brand.colors)?.slice(0, 5).map((c: string) => (
                      <span key={c} className="h-5 w-5 rounded-full border border-surface-500" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-stone-500">
                      {brand._count?.assets || 0} assets
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/analyze?url=${encodeURIComponent(brand.siteUrl)}&stage=create&brandId=${brand.id}`}
                        className="rounded-lg bg-surface-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-surface-500"
                      >
                        Generate
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteBrand(brand.id)}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
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
              placeholder="Search assets..."
              className="flex-1 rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white placeholder:text-stone-500"
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
                <p className="text-stone-400">No matching assets. Adjust filters or generate new ones.</p>
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div key={asset.id} className="group relative overflow-hidden rounded-xl border border-surface-600 bg-surface-800/50 transition hover:border-brand-500/50">
                  <div className="relative aspect-video w-full bg-surface-700">
                    <Image src={asset.url} alt={asset.label} fill unoptimized className="object-cover" />
                  </div>
                  <div className="p-4">
                    <p className="truncate font-medium text-white">{asset.label}</p>
                    <p className="text-xs text-stone-500">{asset.width}×{asset.height}</p>
                    {asset.brand && (
                      <p className="mt-1 text-xs text-stone-400">{asset.brand.name}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => downloadAsset(asset)}
                        className="flex-1 rounded-lg bg-brand-500 py-2 text-xs font-medium text-white hover:bg-brand-400"
                      >
                        Download
                      </button>
                      {asset.brand?.siteUrl && (
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
                      >
                        ×
                      </button>
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

"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";

// ─── Types ────────────────────────────────────────────────────────────────────

type Brand = {
  id: string;
  name: string;
  domain: string;
  siteUrl: string;
  colors: string[] | string;
  image: string | null;
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
const IconSparkle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/><path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z"/>
  </svg>
);

// ─── SIZE OPTIONS ─────────────────────────────────────────────────────────────

const SIZE_OPTIONS = [
  { label: "Square", value: "1024x1024", hint: "IG Post" },
  { label: "Portrait", value: "1024x1344", hint: "Story" },
  { label: "Landscape", value: "1344x768", hint: "Banner" },
  { label: "Wide", value: "1536x640", hint: "LinkedIn" },
];

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, onDownload, onDelete }: {
  asset: Asset;
  onDownload: (a: Asset) => void;
  onDelete: (id: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const canOpen = !!asset.brand?.siteUrl && asset.brand.siteUrl !== "https://logo-only.brandbloom.local";
  const openHref = canOpen
    ? `/analyze?url=${encodeURIComponent(asset.brand!.siteUrl)}&brandId=${asset.brand!.id}`
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-800 transition-all duration-150 hover:border-surface-500 hover:shadow-xl hover:shadow-black/30">
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
            <Link href={openHref} title="Open"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-600 text-stone-500 hover:border-surface-500 hover:text-white transition">
              <IconOpen />
            </Link>
          ) : <div className="h-7 w-7 shrink-0" />}

          {asset.brand ? (
            <a href={`/api/brand-kit-pdf?brandId=${asset.brand.id}`} target="_blank" rel="noopener noreferrer" title="PDF"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-600 text-stone-500 hover:border-surface-500 hover:text-white transition">
              <IconPDF />
            </a>
          ) : <div className="h-7 w-7 shrink-0" />}

          <div className="flex-1" />

          <button type="button" onClick={() => onDownload(asset)} disabled={!asset.url || imgError}
            className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-brand-500/20 px-2.5 text-[11px] font-medium text-brand-300 hover:bg-brand-500/30 disabled:opacity-40 transition">
            <IconDownload /> Save
          </button>

          <button type="button" onClick={() => onDelete(asset.id)} title="Delete"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ghost "generating" card ──────────────────────────────────────────────────

function GhostCard({ prompt }: { prompt: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-brand-500/30 bg-surface-800">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-700">
        {/* Shimmer */}
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

// ─── Brand Card ───────────────────────────────────────────────────────────────

function BrandCard({ brand, onDelete, onSelect }: {
  brand: Brand;
  onDelete: (id: string, name: string) => void;
  onSelect: (id: string) => void;
}) {
  const colors = parseColors(brand.colors);
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
            <span key={`${c}-${i}`} className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: c }} title={c} />
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        <p className="mb-2.5 text-[11px] text-stone-600">{brand._count?.assets ?? 0} asset{brand._count?.assets !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-2">
          <a href={`/api/brand-kit-pdf?brandId=${brand.id}`} target="_blank" rel="noopener noreferrer"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-surface-600 px-2.5 text-[11px] text-stone-500 hover:border-surface-500 hover:text-white transition">
            <IconPDF /> PDF
          </a>
          <button type="button" onClick={() => onSelect(brand.id)}
            className="flex h-8 flex-1 items-center justify-center rounded-lg bg-brand-500/20 text-[11px] font-semibold text-brand-300 hover:bg-brand-500/30 transition">
            Create →
          </button>
          <button type="button" onClick={() => onDelete(brand.id, brand.name)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Bar ───────────────────────────────────────────────────────────────

function CreateBar({ brands, initialBrandId, onAssetCreated }: {
  brands: Brand[];
  initialBrandId?: string;
  onAssetCreated: (asset: Asset) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [brandId, setBrandId] = useState(initialBrandId ?? brands[0]?.id ?? "");
  const [size, setSize] = useState("1024x1024");
  const [state, setState] = useState<GeneratingState>("idle");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // keep brandId in sync if brands load later
  useEffect(() => {
    if (!brandId && brands.length > 0) setBrandId(brands[0].id);
  }, [brands, brandId]);

  const [w, h] = size.split("x").map(Number);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !brandId || state !== "idle") return;
    setError("");
    setState("planning");

    try {
      const selectedBrand = brands.find((b) => b.id === brandId);

      // Step 1 — generate single asset
      setState("generating");
      const res = await fetch("/api/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          prompt: prompt.trim(),
          width: w,
          height: h,
          count: 1,
          // Pass brand context if available
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
        setState("done");
        setPrompt("");
        setTimeout(() => setState("idle"), 1500);
      } else {
        throw new Error("No asset returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  }

  const isGenerating = state === "generating" || state === "planning";

  const stateLabel: Record<GeneratingState, string> = {
    idle: "Generate",
    planning: "Planning…",
    generating: "Generating…",
    done: "✓ Done!",
  };

  return (
    <form onSubmit={handleGenerate}
      className="mb-8 rounded-2xl border border-surface-700 bg-surface-800/80 p-4 backdrop-blur-sm">

      {/* Prompt row */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(e); }
            }}
            placeholder={'Describe what you need — e.g. "Instagram post for a summer sale with bold colours"'}
            rows={2}
            disabled={isGenerating}
            className="w-full resize-none rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none disabled:opacity-50 leading-relaxed"
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Brand picker */}
        {brands.length > 0 && (
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)}
            className="h-9 rounded-lg border border-surface-600 bg-surface-700 px-3 text-xs text-white focus:border-brand-500 focus:outline-none">
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        {/* Size picker */}
        <div className="flex gap-1">
          {SIZE_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setSize(opt.value)}
              className={`flex h-9 flex-col items-center justify-center rounded-lg border px-2.5 transition ${
                size === opt.value
                  ? "border-brand-500 bg-brand-500/10 text-brand-300"
                  : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"
              }`}>
              <span className="text-[10px] font-medium leading-none">{opt.label}</span>
              <span className="text-[9px] leading-none text-stone-600 mt-0.5">{opt.hint}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Generate */}
        <button type="submit"
          disabled={isGenerating || !prompt.trim() || !brandId}
          className={`flex h-9 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition ${
            state === "done"
              ? "bg-green-500/20 text-green-300"
              : "bg-brand-500 text-white hover:bg-brand-400 disabled:opacity-50"
          }`}>
          {isGenerating
            ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> {stateLabel[state]}</>
            : <><IconSparkle /> {stateLabel[state]}</>
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Generating ghost card row hint */}
      {isGenerating && (
        <p className="mt-2 text-xs text-stone-600">
          Your asset is generating — it will appear in the grid below in ~15–30s.
        </p>
      )}
    </form>
  );
}

// ─── Skeleton for prerender / Suspense fallback ───────────────────────────────

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

// ─── Page (wrapped in Suspense so useSearchParams does not break prerender) ─────

function DashboardContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"create" | "brands">("create");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState<string | null>(null);

  // Brand pre-selected from URL param (just added a new brand)
  const initialBrandId = searchParams?.get("brandId") ?? undefined;

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
        window.location.href = "/login?callbackUrl=/dashboard";
        return;
      }
      if (brandsRes.ok) { const d = await brandsRes.json().catch(() => ({})) as { brands?: Brand[] }; setBrands(d.brands ?? []); }
      if (assetsRes.ok) { const d = await assetsRes.json().catch(() => ({})) as { assets?: Asset[] }; setAssets(d.assets ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function deleteBrand(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its assets?`)) return;
    const res = await fetch(`/api/brands/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { setBrands((p) => p.filter((b) => b.id !== id)); setAssets((p) => p.filter((a) => a.brand?.id !== id)); }
    else setDeleteError("Failed to delete brand.");
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
    setGeneratingPrompt(null);
  }

  const assetTypes = [...new Set(assets.map((a) => a.type).filter(Boolean))];

  const filteredAssets = assets.filter((asset) => {
    const matchesType = assetTypeFilter === "all" || asset.type === assetTypeFilter;
    const q = assetSearch.trim().toLowerCase();
    if (!q) return matchesType;
    return matchesType && [asset.label, asset.type, asset.brand?.name, asset.sourceIdea].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  // ── Loading / Unauthed ────────────────────────────────────────────────────

  if (status === "loading" || loading) return (
    <main className="min-h-screen"><Header />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    </main>
  );

  if (status === "unauthenticated") return (
    <main className="min-h-screen"><Header />
      <div className="mx-auto max-w-lg px-4 pt-32 text-center">
        <h1 className="mb-4 text-2xl font-bold text-white">Sign in to continue</h1>
        <Link href="/login" className="inline-block rounded-xl bg-brand-500 px-6 py-3 font-medium text-white hover:bg-brand-400">Sign in</Link>
      </div>
    </main>
  );

  // ── No brands yet → redirect to analyze ──────────────────────────────────

  if (!loading && brands.length === 0) return (
    <main className="min-h-screen"><Header />
      <div className="mx-auto max-w-lg px-4 pt-32 pb-24 text-center">
        <div className="mb-6 text-5xl">🌱</div>
        <h1 className="mb-3 text-3xl font-bold text-white">Add your first brand</h1>
        <p className="mb-8 text-stone-400">Enter your website URL and BrandBloom will learn your brand identity in seconds.</p>
        <Link href="/analyze" className="inline-block rounded-xl bg-brand-500 px-8 py-3 font-semibold text-white hover:bg-brand-400">
          Get started →
        </Link>
      </div>
    </main>
  );

  // ── Main dashboard ────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-24">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {session?.user?.name ? `Hey, ${session.user.name.split(" ")[0]} 👋` : "Dashboard"}
            </h1>
            <p className="text-sm text-stone-500">{brands.length} brand{brands.length !== 1 ? "s" : ""} · {assets.length} asset{assets.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/campaign"
              className="rounded-xl border border-surface-600 px-4 py-2 text-sm font-medium text-stone-400 hover:border-surface-500 hover:text-white transition">
              ⚡ Campaign
            </Link>
            <Link href="/analyze"
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400 transition">
              + New Brand
            </Link>
          </div>
        </div>

        {/* Error */}
        {deleteError && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {deleteError}
            <button onClick={() => setDeleteError(null)} className="ml-3">×</button>
          </div>
        )}

        {/* ── Create Bar (always visible) ── */}
        <CreateBar
          brands={brands}
          initialBrandId={initialBrandId}
          onAssetCreated={handleAssetCreated}
        />

        {/* ── Tabs ── */}
        <div className="mb-6 flex gap-6 border-b border-surface-700">
          {(["create", "brands"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition capitalize ${
                activeTab === tab ? "border-b-2 border-brand-500 text-white" : "text-stone-500 hover:text-stone-300"
              }`}>
              {tab === "create"
                ? `Assets (${assets.length})`
                : `Brands (${brands.length})`}
            </button>
          ))}
        </div>

        {/* ── Assets grid ── */}
        {activeTab === "create" && (
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

            {filteredAssets.length === 0 && !generatingPrompt ? (
              <div className="rounded-2xl border border-dashed border-surface-700 p-16 text-center">
                <p className="text-stone-500">
                  {assetSearch || assetTypeFilter !== "all"
                    ? "No assets match your filters."
                    : "Type a prompt above and hit Generate to create your first asset."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {generatingPrompt && <GhostCard prompt={generatingPrompt} />}
                {filteredAssets.map((a) => (
                  <AssetCard key={a.id} asset={a} onDownload={downloadAsset} onDelete={deleteAsset} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Brands grid ── */}
        {activeTab === "brands" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((b) => (
              <BrandCard key={b.id} brand={b} onDelete={deleteBrand}
                onSelect={(id) => {
                  setActiveTab("create");
                  // Scroll to create bar
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
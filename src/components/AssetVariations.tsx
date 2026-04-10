import { useState } from "react";

type Asset = {
  id: string;
  url: string | null;
  label: string;
  type: string;
  width: number;
  height: number;
  prompt?: string | null;
  brand?: { id: string; name: string; domain: string; siteUrl: string } | null;
};

const VARIANT_PLATFORMS = [
  { label: "IG Post", aspectRatio: "1:1", size: "1024×1024" },
  { label: "IG Story", aspectRatio: "9:16", size: "1024×1344" },
  { label: "Banner", aspectRatio: "16:9", size: "1344×768" },
  { label: "LinkedIn", aspectRatio: "21:9", size: "1536×640" },
  { label: "Pinterest", aspectRatio: "2:3", size: "1024×1536" },
];

export function AssetVariations({
  asset,
  onClose,
  onVariantsCreated,
}: {
  asset: Asset;
  onClose: () => void;
  onVariantsCreated: (assets: Asset[]) => void;
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function generateAll() {
    if (generating) return;
    setError("");
    setGenerating("all");
    try {
      const res = await fetch("/api/assets/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          aspectRatios: VARIANT_PLATFORMS.map((p) => p.aspectRatio),
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({})) as { assets?: Asset[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed.");
      onVariantsCreated(data.assets ?? []);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setGenerating(null);
    }
  }

  async function generateOne(aspectRatio: string) {
    if (generating) return;
    setError("");
    setGenerating(aspectRatio);
    try {
      const res = await fetch("/api/assets/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, aspectRatios: [aspectRatio] }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({})) as { assets?: Asset[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed.");
      onVariantsCreated(data.assets ?? []);
      onClose();
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
            <p className="text-xs text-stone-500 mt-0.5">Generate variants for popular platforms</p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-600 hover:text-white transition text-lg leading-none">×</button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-700 p-3">
          {asset.url && (
            <img src={asset.url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{asset.label}</p>
            <p className="text-[10px] text-stone-500">{asset.width}×{asset.height} · original</p>
          </div>
        </div>

        <button
          type="button"
          onClick={generateAll}
          disabled={!!generating}
          className="mb-3 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 disabled:opacity-60"
        >
          {generating === "all" ? "Generating all…" : "Generate all sizes"}
        </button>

        <div className="space-y-1.5">
          {VARIANT_PLATFORMS.map((p) => {
            const isGenerating = generating === p.aspectRatio;
            return (
              <button
                key={p.aspectRatio}
                type="button"
                disabled={!!generating}
                onClick={() => generateOne(p.aspectRatio)}
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

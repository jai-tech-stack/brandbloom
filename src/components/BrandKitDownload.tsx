"use client";

import { useState } from "react";
import { useBrandKit } from "@/lib/hooks/useBrandKit";

type BrandKitDownloadProps = {
  brandId: string;
  includeAssets?: boolean;
  className?: string;
  label?: string;
};

export function BrandKitDownload({
  brandId,
  includeAssets = true,
  className,
  label = "PDF",
}: BrandKitDownloadProps) {
  const { downloadBrandKit, loading, error } = useBrandKit();
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleClick() {
    setLocalError(null);
    try {
      await downloadBrandKit(brandId, includeAssets);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not download brand kit.";
      setLocalError(message);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "flex h-8 items-center gap-1.5 rounded-lg border border-surface-600 px-2.5 text-[11px] text-stone-500 hover:border-surface-500 hover:text-white transition disabled:opacity-50"
        }
      >
        {loading ? "Generating..." : label}
      </button>
      {(localError || error) && (
        <p className="mt-1 text-[11px] text-red-400">{localError || error}</p>
      )}
    </div>
  );
}

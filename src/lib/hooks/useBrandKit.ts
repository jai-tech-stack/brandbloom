"use client";

import { useCallback, useState } from "react";

type BrandKitResponse = {
  success?: boolean;
  data?: {
    pdfUrl?: string;
    downloadUrl?: string;
    fileName?: string;
  };
  error?: string | null;
};

export function useBrandKit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadBrandKit = useCallback(async (brandId: string, includeAssets = true) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/brand-kit-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ brandId, includeAssets }),
      });
      const payload = (await response.json().catch(() => ({}))) as BrandKitResponse;
      if (!response.ok || !payload.data?.downloadUrl) {
        throw new Error(payload.error || "Failed to generate brand kit PDF.");
      }

      const link = document.createElement("a");
      link.href = payload.data.downloadUrl;
      link.download = payload.data.fileName || "brand-kit.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to generate brand kit PDF.";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloadBrandKit, loading, error };
}

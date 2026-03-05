"use client";

import { useEffect, useRef } from "react";

function isChunkLoadError(message: string): boolean {
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Loading CSS chunk") ||
    message.includes("Failed to fetch dynamically imported module")
  );
}

/**
 * Reload the page once when a chunk fails to load (e.g. after a new deploy).
 * Prevents "Failed to load chunk" / ChunkLoadError from leaving the app broken.
 */
export function ChunkLoadErrorHandler() {
  const reloaded = useRef(false);

  useEffect(() => {
    function tryReload() {
      if (!reloaded.current) {
        reloaded.current = true;
        window.location.reload();
      }
    }

    function handleError(e: ErrorEvent) {
      if (isChunkLoadError(e.message ?? "")) tryReload();
    }

    function handleRejection(e: PromiseRejectionEvent) {
      const msg =
        (e.reason?.message ?? String(e.reason ?? "")).toString();
      if (isChunkLoadError(msg)) tryReload();
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

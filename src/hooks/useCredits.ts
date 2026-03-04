"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface CreditState {
  credits: number | null;   // null = not loaded yet
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Global credit state kept in sync via the "credits-updated" custom event. */
export function useCredits(): CreditState {
  const { status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { user?: { credits?: number } };
        if (typeof data.user?.credits === "number") {
          setCredits(data.user.credits);
          // Broadcast so other components stay in sync
          window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.user.credits }));
        }
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") { setCredits(null); return; }
    refresh();
  }, [status, refresh]);

  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setCredits(detail);
    }
    window.addEventListener("credits-updated", onUpdate);
    return () => window.removeEventListener("credits-updated", onUpdate);
  }, []);

  return { credits, loading, refresh };
}
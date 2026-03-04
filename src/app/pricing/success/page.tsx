"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [credits, setCredits] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Refresh credits after successful payment
    async function refreshCredits() {
      try {
        // Small delay to let webhook process
        await new Promise((r) => setTimeout(r, 1500));
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json() as { user?: { credits?: number } };
          if (typeof data.user?.credits === "number") {
            setCredits(data.user.credits);
            window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.user.credits }));
          }
        }
      } catch { /* silent */ } finally {
        setLoaded(true);
      }
    }
    refreshCredits();
  }, [sessionId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-900 px-4 text-white">
      <div className="w-full max-w-sm text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-3xl">✓</div>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-white">Payment successful!</h1>
        <p className="mb-6 text-stone-400">
          Your credits have been added to your account.
        </p>

        {loaded && credits !== null && (
          <div className="mb-6 rounded-xl border border-brand-500/25 bg-brand-500/10 px-5 py-4">
            <p className="text-sm text-stone-400">Current balance</p>
            <p className="mt-1 text-3xl font-bold text-brand-400">⚡ {credits} credits</p>
          </div>
        )}

        {!loaded && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-stone-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            Updating your balance…
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/analyze"
            className="block w-full rounded-2xl bg-brand-500 py-3.5 text-center font-bold text-white transition hover:bg-brand-400"
          >
            Start generating →
          </Link>
          <Link
            href="/dashboard"
            className="block w-full rounded-xl border border-surface-500 py-3 text-center text-sm font-medium text-stone-400 transition hover:text-white"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PricingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
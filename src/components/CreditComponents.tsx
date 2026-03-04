"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCredits } from "@/hooks/useCredits";

// ─── 1. Credit pill for nav bar ───────────────────────────────────────────────
export function CreditBadge() {
  const { credits, loading } = useCredits();

  if (loading || credits === null) return null;

  const low = credits <= 3;
  const empty = credits === 0;

  return (
    <Link
      href="/pricing"
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-80 ${
        empty
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : low
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-surface-500 bg-surface-800 text-stone-400"
      }`}
      title="Buy more credits"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${empty ? "bg-red-400" : low ? "bg-amber-400 animate-pulse" : "bg-brand-400"}`} />
      {credits} credit{credits !== 1 ? "s" : ""}
      {low && !empty && " · low"}
      {empty && " · get more"}
    </Link>
  );
}

// ─── 2. Inline warning banner (shown above generate buttons when low) ─────────
interface CreditWarningProps {
  cost?: number;  // credits this action will cost (default 1)
}

export function CreditWarning({ cost = 1 }: CreditWarningProps) {
  const { credits } = useCredits();

  if (credits === null) return null;

  const empty = credits === 0;
  const insufficient = credits < cost;
  const low = credits <= 3 && !empty && !insufficient;

  if (!empty && !insufficient && !low) return null;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
      empty || insufficient
        ? "border-red-500/25 bg-red-500/10 text-red-300"
        : "border-amber-500/25 bg-amber-500/10 text-amber-300"
    }`}>
      <div className="flex items-center gap-2">
        <span>{empty || insufficient ? "⚠️" : "💡"}</span>
        <span>
          {empty
            ? "You're out of credits."
            : insufficient
            ? `This costs ${cost} credits, but you only have ${credits}.`
            : `You have ${credits} credit${credits !== 1 ? "s" : ""} remaining.`}
        </span>
      </div>
      <Link
        href="/pricing"
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:opacity-90 ${
          empty || insufficient ? "bg-red-500 text-white" : "bg-amber-500 text-black"
        }`}
      >
        Get credits →
      </Link>
    </div>
  );
}

// ─── 3. Cost indicator (shows "1 credit" next to generate buttons) ────────────
interface CreditCostProps {
  cost?: number;
  label?: string;
}

export function CreditCost({ cost = 1, label }: CreditCostProps) {
  const { credits } = useCredits();
  const canAfford = credits === null || credits >= cost;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      canAfford ? "bg-surface-700 text-stone-500" : "bg-red-500/15 text-red-400"
    }`}>
      <span className="text-brand-500">⚡</span>
      {cost} credit{cost !== 1 ? "s" : ""}
      {label ? ` · ${label}` : ""}
    </span>
  );
}

// ─── 4. Out-of-credits modal (shown when a generation fails due to 0 credits) ─
interface OutOfCreditsModalProps {
  open: boolean;
  onClose: () => void;
  action?: string;  // e.g. "generate an Instagram post"
}

export function OutOfCreditsModal({ open, onClose, action }: OutOfCreditsModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-surface-600 bg-surface-800 p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-3xl">⚡</div>
          <h2 className="text-lg font-bold text-white">Out of credits</h2>
          <p className="mt-1.5 text-sm text-stone-400">
            {action
              ? `You need credits to ${action}.`
              : "You've used all your credits."}
            {" "}Get more to keep generating.
          </p>
        </div>

        <div className="space-y-2.5 rounded-xl border border-surface-600 bg-surface-900/50 p-4">
          {[
            { label: "Starter", credits: 50, price: "$9", highlight: false },
            { label: "Popular", credits: 200, price: "$29", highlight: true },
            { label: "Pro", credits: 500, price: "$59", highlight: false },
          ].map((tier) => (
            <Link
              key={tier.label}
              href={`/pricing?credits=${tier.credits}`}
              onClick={onClose}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                tier.highlight
                  ? "border-brand-500/50 bg-brand-500/10 hover:bg-brand-500/15"
                  : "border-surface-600 hover:border-surface-500"
              }`}
            >
              <div>
                <p className={`text-sm font-semibold ${tier.highlight ? "text-brand-300" : "text-white"}`}>{tier.credits} credits</p>
                {tier.highlight && <p className="text-xs text-brand-400">Most popular</p>}
              </div>
              <span className={`text-sm font-bold ${tier.highlight ? "text-brand-400" : "text-stone-400"}`}>{tier.price}</span>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-surface-500 py-2.5 text-sm font-medium text-stone-400 transition hover:text-white"
          >
            Maybe later
          </button>
          <Link
            href="/pricing"
            onClick={onClose}
            className="flex-1 rounded-xl bg-brand-500 py-2.5 text-center text-sm font-bold text-white transition hover:bg-brand-400"
          >
            View all plans →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── 5. useGenerateWithCredits — wraps any generate call with credit checks ────
// Usage: const { generate, outOfCredits, setOutOfCredits } = useGenerateWithCredits()
// Then: await generate(() => fetch('/api/generate-assets', ...), cost)
export function useGenerateGuard(cost = 1) {
  const { credits, refresh } = useCredits();
  const [showModal, setShowModal] = useState(false);

  function canGenerate(): boolean {
    if (credits === null) return true; // unknown — let server decide
    if (credits < cost) { setShowModal(true); return false; }
    return true;
  }

  async function afterGenerate(newCredits?: number) {
    if (typeof newCredits === "number") {
      window.dispatchEvent(new CustomEvent("credits-updated", { detail: newCredits }));
    } else {
      await refresh();
    }
  }

  return { canGenerate, showModal, setShowModal, afterGenerate, credits };
}
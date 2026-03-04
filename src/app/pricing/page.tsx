"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCredits } from "@/hooks/useCredits";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 9,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? "",
    perCredit: "$0.18",
    highlight: false,
    features: ["50 credits", "Standard quality generation", "All asset types", "PNG/JPG/WebP export"],
  },
  {
    id: "popular",
    name: "Popular",
    credits: 200,
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_POPULAR ?? "",
    perCredit: "$0.14",
    highlight: true,
    features: ["200 credits", "Standard + 4K quality", "All asset types", "Platform resize", "Photo → branded"],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 500,
    price: 59,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "",
    perCredit: "$0.12",
    highlight: false,
    features: ["500 credits", "Everything in Popular", "Logo generation agent", "Campaign planning", "Priority support"],
  },
];

const SUBSCRIPTION_PLANS = [
  {
    id: "sub_pro",
    name: "Pro Monthly",
    credits: 200,
    price: 19,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SUB_PRO ?? "",
    highlight: true,
    features: ["200 credits/month", "4K output", "Photo → branded", "8-platform resize", "Priority generation", "Credits reset monthly"],
  },
  {
    id: "sub_agency",
    name: "Agency Monthly",
    credits: 999,
    price: 79,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SUB_AGENCY ?? "",
    highlight: false,
    features: ["Unlimited credits", "Multiple brands", "Campaign planning", "API access", "Priority support", "Team collaboration"],
  },
];

export default function PricingPage() {
  const { status } = useSession();
  const { credits } = useCredits();
  const [tab, setTab] = useState<"topup" | "subscription">("topup");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(priceId: string, planId: string, mode: "payment" | "subscription") {
    if (status !== "authenticated") {
      window.location.href = `/login?callbackUrl=${encodeURIComponent("/pricing")}`;
      return;
    }
    if (!priceId) {
      setError("This plan isn't configured yet. Please contact support.");
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId, mode }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Checkout failed. Please try again.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-surface-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">B</div>
            <span className="text-sm font-bold text-white">BrandBloom</span>
          </Link>
          <div className="flex items-center gap-3">
            {typeof credits === "number" && (
              <span className="rounded-full border border-surface-500 bg-surface-800 px-3 py-1 text-xs text-stone-400">
                ⚡ {credits} credits remaining
              </span>
            )}
            <Link href="/dashboard" className="text-sm text-stone-400 hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-28">
        {/* Header */}
        <div className="mb-12 text-center">
          {credits !== null && credits <= 3 && (
            <div className={`mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${credits === 0 ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
              {credits === 0 ? "⚠️ You're out of credits" : `⚡ Only ${credits} credits left`} — top up to keep generating
            </div>
          )}
          <h1 className="text-4xl font-bold text-white">Get more credits</h1>
          <p className="mt-3 text-stone-400">Pay once, use anytime. Credits never expire.</p>
        </div>

        {/* Tab switcher */}
        <div className="mb-10 flex justify-center">
          <div className="flex rounded-xl border border-surface-600 bg-surface-800/50 p-1">
            <button
              type="button"
              onClick={() => setTab("topup")}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === "topup" ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}
            >
              Credit top-ups
            </button>
            <button
              type="button"
              onClick={() => setTab("subscription")}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === "subscription" ? "bg-brand-500 text-white" : "text-stone-400 hover:text-white"}`}
            >
              Monthly plans
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Top-up plans */}
        {tab === "topup" && (
          <>
            <div className="grid gap-5 sm:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 ${plan.highlight ? "border-brand-500/50 bg-surface-800/70 ring-1 ring-brand-500/20" : "border-surface-600 bg-surface-800/40"}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-white">Best value</div>
                  )}
                  <p className={`text-xs font-semibold uppercase tracking-wider ${plan.highlight ? "text-brand-400" : "text-stone-500"}`}>{plan.name}</p>
                  <div className="mt-3 flex items-end gap-1">
                    <p className="text-4xl font-bold text-white">${plan.price}</p>
                    <p className="mb-1 text-sm text-stone-500">one-time</p>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-600">{plan.perCredit} per credit</p>

                  <ul className="mt-5 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-stone-400">
                        <span className="text-brand-500">✓</span>{f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={!!loading}
                    onClick={() => handleCheckout(plan.priceId, plan.id, "payment")}
                    className={`mt-5 w-full rounded-xl py-3 text-sm font-bold transition ${
                      plan.highlight
                        ? "bg-brand-500 text-white hover:bg-brand-400"
                        : "border border-surface-500 text-white hover:border-surface-400"
                    } disabled:cursor-wait disabled:opacity-60`}
                  >
                    {loading === plan.id
                      ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Redirecting…</span>
                      : `Get ${plan.credits} credits →`}
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-stone-600">
              Credits are added instantly after payment. Powered by{" "}
              <span className="text-stone-500">Stripe</span> — secure, encrypted checkout.
            </p>
          </>
        )}

        {/* Subscription plans */}
        {tab === "subscription" && (
          <>
            <div className="mx-auto grid max-w-2xl gap-5 sm:grid-cols-2">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 ${plan.highlight ? "border-brand-500/50 bg-surface-800/70 ring-1 ring-brand-500/20" : "border-surface-600 bg-surface-800/40"}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-white">Popular</div>
                  )}
                  <p className={`text-xs font-semibold uppercase tracking-wider ${plan.highlight ? "text-brand-400" : "text-stone-500"}`}>{plan.name}</p>
                  <div className="mt-3 flex items-end gap-1">
                    <p className="text-4xl font-bold text-white">${plan.price}</p>
                    <p className="mb-1 text-sm text-stone-500">/month</p>
                  </div>
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-stone-400">
                        <span className="text-brand-500">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={!!loading}
                    onClick={() => handleCheckout(plan.priceId, plan.id, "subscription")}
                    className={`mt-5 w-full rounded-xl py-3 text-sm font-bold transition ${
                      plan.highlight
                        ? "bg-brand-500 text-white hover:bg-brand-400"
                        : "border border-surface-500 text-white hover:border-surface-400"
                    } disabled:cursor-wait disabled:opacity-60`}
                  >
                    {loading === plan.id
                      ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Redirecting…</span>
                      : "Subscribe →"}
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-stone-600">Cancel anytime. Credits reset on your billing date.</p>
          </>
        )}

        {/* Credit usage guide */}
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-surface-600 bg-surface-800/30 p-6">
          <h3 className="mb-4 text-sm font-bold text-white">How credits work</h3>
          <div className="space-y-2.5">
            {[
              { action: "Standard image generation", cost: "1 credit" },
              { action: "4K image generation", cost: "2 credits" },
              { action: "Photo → Branded transform", cost: "1 credit" },
              { action: "Platform resize", cost: "1 credit per size" },
              { action: "URL brand extraction", cost: "Free" },
              { action: "Logo brand creation", cost: "Free" },
              { action: "Brand DNA editor", cost: "Free" },
            ].map((item) => (
              <div key={item.action} className="flex items-center justify-between text-xs">
                <span className="text-stone-400">{item.action}</span>
                <span className={item.cost === "Free" ? "text-brand-400 font-semibold" : "font-semibold text-white"}>{item.cost}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Free plan note */}
        <p className="mt-8 text-center text-xs text-stone-600">
          New accounts get <span className="text-stone-400">10 free credits</span> on signup — no credit card required.{" "}
          {status !== "authenticated" && (
            <Link href="/register" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">Create a free account →</Link>
          )}
        </p>
      </div>
    </div>
  );
}
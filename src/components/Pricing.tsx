"use client";

import { DEFAULT_CREDITS } from "@/lib/credits";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Try BrandBloom with limited generations.",
    features: [`${DEFAULT_CREDITS} free credits`, "Basic brand extraction", "Standard formats"],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For creators and small teams.",
    features: [
      "100 credits/month",
      "Full brand extraction",
      "All formats & sizes",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Custom credits, support, and volume discounts.",
    features: ["Custom credit allocation", "Dedicated support", "Volume discounts"],
    cta: "Contact us",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-surface-700 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
          Simple pricing
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-stone-400">
          Start free. Upgrade when you need more.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-surface-600 bg-surface-800/50"
              }`}
            >
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                {plan.period && (
                  <span className="text-stone-400">{plan.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-stone-400">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-stone-300">
                    <span className="text-brand-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-8 w-full rounded-xl py-3 font-medium transition ${
                  plan.highlighted
                    ? "bg-brand-500 text-white hover:bg-brand-400"
                    : "border border-surface-500 text-white hover:border-surface-400"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";

const features = [
  {
    id: "create",
    label: "CREATE IMAGES",
    title: "Create anything your brand needs — in seconds.",
    description:
      "A product shot for your website, a summer sale banner, an Instagram carousel – if your brand needs it, we make it.",
  },
  {
    id: "edit",
    label: "EDIT IMAGES",
    title: "Edit images and perfect every detail.",
    description:
      "Tweak the headline. Swap the product. Change the background. You get exactly what you need.",
  },
  {
    id: "resize",
    label: "AI-POWERED RESIZE",
    title: "Effortlessly resize for every platform.",
    description:
      "Make it once, resize for every platform in a click. Instagram Stories, Facebook posts, Google Ads – without losing its character.",
  },
  {
    id: "upload",
    label: "UPLOAD IMAGES",
    title: "Upload & turn your photos into designer-quality assets.",
    description:
      "Bring your product photos, previous campaign visuals, or your everyday pictures – and transform them into polished branded visuals.",
  },
  {
    id: "4k",
    label: "4K IMAGES",
    title: "Generate in 4K — only the best for your brand.",
    description:
      "Crisp, pixel-perfect visuals ready for web, social, print, or anything in between. Images you'd actually put your name on.",
  },
];

export function FeaturesBloom() {
  return (
    <section id="features" className="border-t border-surface-700 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-3 text-center text-3xl font-bold text-white sm:text-4xl">
          Everything you need to look like a big brand
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-stone-400">
          Powerful tools that make professional design effortless.
        </p>
        <div className="mb-12 flex justify-center">
          <Link
            href="/#get-started"
            className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-400"
          >
            Start Creating
          </Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl border border-surface-600 bg-surface-800/50 p-6 transition hover:border-brand-500/50 sm:p-8"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                {f.label}
              </p>
              <h3 className="mb-2 text-xl font-semibold text-white">
                {f.title}
              </h3>
              <p className="mb-6 text-sm text-stone-400">{f.description}</p>
              <Link
                href="/#get-started"
                className="inline-block text-sm font-semibold text-brand-400 transition hover:text-brand-300"
              >
                Try Now →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

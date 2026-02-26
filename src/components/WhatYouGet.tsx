"use client";

const blocks = [
  {
    title: "From URL to brand kit",
    description: "We extract identity from your site so you don't type style guides by hand.",
    icon: "🔗",
  },
  {
    title: "Ideas, not blank canvas",
    description: "LinkedIn post, Instagram story, banner — pick an idea, we pre-fill a brand-aware prompt; you edit and create.",
    icon: "💡",
  },
  {
    title: "Full graphics, not just logos",
    description: "Get post and story images, thumbnails, and banners in your colors and style.",
    icon: "🖼️",
  },
  {
    title: "One place for brands and assets",
    description: "Save brands, generate from the same kit, find everything in your dashboard.",
    icon: "📁",
  },
];

export function WhatYouGet() {
  return (
    <section className="border-t border-surface-700 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
          What you get
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-stone-400">
          For marketers, creators, and small teams. URL-first extraction and idea-based generation — no design skills required.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {blocks.map((block, i) => (
            <div
              key={block.title}
              className="rounded-2xl border border-surface-600 bg-surface-800/50 p-6 transition hover:border-brand-500/50"
            >
              <span className="mb-3 block text-2xl" aria-hidden>{block.icon}</span>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {block.title}
              </h3>
              <p className="text-sm leading-relaxed text-stone-400">
                {block.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

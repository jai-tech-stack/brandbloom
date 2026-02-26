"use client";

import Link from "next/link";

const assetTypes = [
  { id: 1, label: "LinkedIn Post", gradient: "from-indigo-500 to-blue-600" },
  { id: 2, label: "Instagram Story", gradient: "from-rose-500 to-pink-600" },
  { id: 3, label: "YouTube Thumbnail", gradient: "from-red-500 to-orange-600" },
  { id: 4, label: "Profile Banner", gradient: "from-violet-500 to-purple-600" },
  { id: 5, label: "Ad Creative", gradient: "from-emerald-500 to-teal-600" },
  { id: 6, label: "Quote Card", gradient: "from-amber-500 to-orange-600" },
  { id: 7, label: "Facebook Post", gradient: "from-blue-500 to-cyan-600" },
  { id: 8, label: "Pinterest Pin", gradient: "from-pink-500 to-rose-600" },
  { id: 9, label: "Product Launch", gradient: "from-teal-500 to-cyan-600" },
  { id: 10, label: "Newsletter", gradient: "from-indigo-500 to-purple-600" },
  { id: 11, label: "Event Invite", gradient: "from-fuchsia-500 to-violet-600" },
  { id: 12, label: "Display Ad", gradient: "from-slate-500 to-stone-600" },
];

export function Gallery() {
  return (
    <section className="border-t border-surface-700 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
          See what you can create
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-stone-400">
          Generated asset types — on-brand, from your URL.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {assetTypes.map((item) => (
            <div
              key={item.id}
              className={`aspect-square rounded-xl border border-surface-600 bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white text-sm font-medium shadow-lg overflow-hidden transition hover:scale-[1.02] hover:shadow-xl hover:border-brand-500/50`}
            >
              <span className="text-center px-2">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-stone-500">
          Start with your URL above to generate these in your brand style.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="#get-started"
            className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-400"
          >
            Try it free
          </Link>
        </div>
      </div>
    </section>
  );
}

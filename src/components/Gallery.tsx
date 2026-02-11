"use client";

const placeholders = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  label: `Asset ${i + 1}`,
}));

export function Gallery() {
  return (
    <section className="border-t border-surface-700 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
          From the community
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-stone-400">
          See what others are creating with BrandBloom.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {placeholders.map((item) => (
            <div
              key={item.id}
              className="aspect-square animate-float rounded-xl border border-surface-600 bg-surface-700/50 flex items-center justify-center text-stone-500"
              style={{ animationDelay: `${item.id * 0.1}s` }}
            >
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

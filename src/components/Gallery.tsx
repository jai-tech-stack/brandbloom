"use client";

const sampleAssets = [
  { id: 1, label: "Tech Startup", color: "#6366f1", gradient: "from-indigo-500 to-purple-600" },
  { id: 2, label: "E-commerce", color: "#10b981", gradient: "from-emerald-500 to-teal-600" },
  { id: 3, label: "Finance App", color: "#3b82f6", gradient: "from-blue-500 to-cyan-600" },
  { id: 4, label: "Health & Wellness", color: "#f43f5e", gradient: "from-rose-500 to-pink-600" },
  { id: 5, label: "Food & Beverage", color: "#f59e0b", gradient: "from-amber-500 to-orange-600" },
  { id: 6, label: "Travel Agency", color: "#8b5cf6", gradient: "from-violet-500 to-purple-600" },
  { id: 7, label: "Real Estate", color: "#14b8a6", gradient: "from-teal-500 to-cyan-600" },
  { id: 8, label: "Fashion Brand", color: "#ec4899", gradient: "from-pink-500 to-rose-600" },
  { id: 9, label: "SaaS Platform", color: "#6366f1", gradient: "from-indigo-500 to-blue-600" },
  { id: 10, label: "Fitness App", color: "#ef4444", gradient: "from-red-500 to-orange-600" },
  { id: 11, label: "Education", color: "#22c55e", gradient: "from-green-500 to-emerald-600" },
  { id: 12, label: "Creative Agency", color: "#a855f7", gradient: "from-purple-500 to-violet-600" },
];

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
          {sampleAssets.map((item) => (
            <div
              key={item.id}
              className={`aspect-square animate-float rounded-xl border border-surface-600 bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white font-medium shadow-lg overflow-hidden group cursor-pointer transition hover:scale-105 hover:shadow-xl`}
              style={{ animationDelay: `${item.id * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
              <span className="text-sm relative z-10 text-center px-2">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-stone-500">
          Generated assets showcase • Your brand could be next
        </p>
      </div>
    </section>
  );
}

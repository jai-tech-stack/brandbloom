"use client";

const steps = [
  {
    step: "1",
    title: "Add your website",
    description:
      "Paste your URL. We scan your site to capture logos, colors, fonts, and style.",
  },
  {
    step: "2",
    title: "Review your brand kit",
    description:
      "See your brand in one place. Edit details if you like, then continue.",
  },
  {
    step: "3",
    title: "Generate assets",
    description:
      "Pick an idea (LinkedIn post, Story, banner). Edit the prompt, hit Create. Download or save to your library.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-surface-700 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-2 text-center text-sm font-medium uppercase tracking-wider text-brand-400">
          Start free
        </p>
        <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
          Get started in just minutes
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-stone-400">
          How it works — three steps from URL to on-brand assets. No design skills needed.
        </p>
        <div className="grid gap-12 md:grid-cols-3">
          {steps.map((item, i) => (
            <div
              key={item.step}
              className="group relative rounded-2xl border border-surface-600 bg-surface-800/50 p-8 transition hover:border-brand-500/50"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="mb-4 inline-block text-4xl font-bold text-brand-500/80">
                {item.step}
              </span>
              <h3 className="mb-3 text-xl font-semibold text-white">
                {item.title}
              </h3>
              <p className="text-stone-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

const faqs = [
  {
    q: "What is BrandBloom?",
    a: "BrandBloom is an AI tool that learns your brand from your website (logos, colors, fonts, style) and generates on-brand images and assets for social media, ads, and more.",
  },
  {
    q: "How does it work?",
    a: "You enter your website URL. We scan it to extract your brand identity, then you can generate assets that automatically match your brand. No design skills required.",
  },
  {
    q: "What types of assets can I generate?",
    a: "Social posts, ad creatives, thumbnails, banners, and more. We support common formats and sizes for major platforms.",
  },
  {
    q: "Who owns the generated assets?",
    a: "You do. All assets you generate with BrandBloom are yours to use for your business.",
  },
  {
    q: "How do I get help?",
    a: "Reach out via the contact link in the footer, or check our FAQ and docs. Pro and Enterprise plans include priority support.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="border-t border-surface-700 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-stone-400">
          Everything you need to know about BrandBloom.
        </p>
        <dl className="space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-surface-600 bg-surface-800/50 p-6"
            >
              <dt className="font-semibold text-white">{faq.q}</dt>
              <dd className="mt-2 text-stone-400">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

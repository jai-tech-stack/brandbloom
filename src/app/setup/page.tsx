import Link from "next/link";
import { Header } from "@/components/Header";

export default function SetupPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-4 pt-24 pb-24">
        <h1 className="mb-2 text-2xl font-bold text-white">Setup guide</h1>
        <p className="mb-8 text-stone-400">What you see in the app and how to get the most out of it.</p>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">API keys at a glance</h2>
          <p className="mb-3 text-sm text-stone-400">
            All keys go in the project <strong className="text-stone-300">root</strong> <code className="rounded bg-surface-700 px-1 text-stone-300">.env</code>. The frontend never sees them; only the backend uses them when you call Create, Logo, or Campaign.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-400">
            <li><strong className="text-stone-300">REPLICATE_API_TOKEN</strong> — Optional. Real AI images (Flux). Without it: placeholder images.</li>
            <li><strong className="text-stone-300">OPENAI_API_KEY</strong> — <strong className="text-amber-300">Required for Start with Logo</strong>. Optional for URL extraction (personality/tone) and campaign strategy.</li>
            <li><strong className="text-stone-300">ANTHROPIC_API_KEY</strong> — Optional fallback for brand personality (URL extraction).</li>
            <li><strong className="text-stone-300">BACKEND_BLOOM_URL</strong> — Optional; use Brand BLOOM+ backend for URL extraction (Claude + CSS).</li>
          </ul>
          <p className="mt-2 text-sm text-stone-500">Full list and feature mapping: <code className="rounded bg-surface-700 px-1 text-stone-300">docs/API_KEYS.md</code></p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">Why am I seeing placeholder images?</h2>
          <p className="text-sm text-stone-400">
            The app works in two modes. Without an image API key, it shows placeholder images so you can try the full flow (extract brand, describe what you want, click Create). That way you can run and demo the app without paying for an image API. It is not cheating — it is a free preview. To get real AI-generated images, add one key below.
          </p>
        </section>

        <section id="images" className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">Image generation: which service & billing</h2>
          <p className="mb-3 text-sm text-stone-400">
            BrandBloom uses <strong className="text-stone-300">Replicate</strong> (Flux) for AI images. There is no separate “image billing” inside the app — billing is on Replicate’s site. Add a payment method there and put your API token in the app.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-400">
            <li><strong className="text-stone-300">Sign up:</strong> <a href="https://replicate.com" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">replicate.com</a></li>
            <li><strong className="text-stone-300">Billing:</strong> <a href="https://replicate.com/account/billing" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">replicate.com/account/billing</a> — add a card or credits (pay-as-you-go, ~$0.003–0.005 per image).</li>
            <li><strong className="text-stone-300">API token:</strong> <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">replicate.com/account/api-tokens</a> — create a token and copy it.</li>
            <li>In your project <strong className="text-stone-300">root</strong>, open <code className="rounded bg-surface-700 px-1 text-stone-300">.env</code> and add <code className="rounded bg-surface-700 px-1 text-stone-300">REPLICATE_API_TOKEN=r8_...</code></li>
            <li>Restart the app: <code className="rounded bg-surface-700 px-1 text-stone-300">Ctrl+C</code> then <code className="rounded bg-surface-700 px-1 text-stone-300">npm run dev</code>.</li>
          </ol>
          <p className="mt-3 text-sm text-stone-500">Full step-by-step guide: <code className="rounded bg-surface-700 px-1 text-stone-300">IMAGE_GENERATION_SETUP.md</code> in the repo.</p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">Why are Fonts or Tone empty?</h2>
          <p className="text-sm text-stone-400">
            Brand data is extracted from the website you enter. Colors, tagline, and description come from the page. Fonts are detected from the site CSS (e.g. Google Fonts, font-family). If the site does not expose font names in a way we can parse, we show None detected from this site. Tone is inferred by an optional AI step (needs OPENAI or ANTHROPIC key); without it we show Default style. For richer extraction (fonts, logo, tone), you can run the optional Brand BLOOM+ backend — see RUN_FROM_SCRATCH.md in the repo.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">Trybloom-level extraction (complete process)</h2>
          <p className="mb-3 text-sm text-stone-400">
            For full “Bloom learns your brand” behavior (logos, colors, fonts, design aesthetic), run the Python backend so the app uses Claude + CSS extraction instead of HTML-only.
          </p>
          <p className="text-sm text-stone-400">
            In root <code className="rounded bg-surface-700 px-1 text-stone-300">.env</code>: <code className="rounded bg-surface-700 px-1 text-stone-300">BACKEND_BLOOM_URL=http://localhost:8000</code> and <code className="rounded bg-surface-700 px-1 text-stone-300">ANTHROPIC_API_KEY=...</code>. Then run <code className="rounded bg-surface-700 px-1 text-stone-300">cd backend; uvicorn api.main:app --reload</code>.
          </p>
          <p className="mt-3 text-sm text-stone-500">
            Honest gap list and full parity steps: <code className="rounded bg-surface-700 px-1 text-stone-300">TRYBLOOM_CLONE_STATUS.md</code> in the repo.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/analyze" className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-400">Back to create</Link>
          <Link href="/" className="rounded-xl border border-surface-500 px-5 py-2.5 text-sm font-medium text-stone-300 hover:border-surface-400">Home</Link>
        </div>
      </div>
    </main>
  );
}

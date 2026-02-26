"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-surface-700 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="font-semibold text-white">
            Brand<span className="text-brand-400">Bloom</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-stone-400">
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
            >
              X (Twitter)
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
            >
              Discord
            </a>
          </nav>
        </div>
        <p className="mt-8 text-center text-sm text-stone-500">
          © {new Date().getFullYear()} BrandBloom. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

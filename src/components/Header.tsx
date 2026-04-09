"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useCredits } from "@/hooks/useCredits";

export function Header() {
  const { data: session, status } = useSession();
  const { credits } = useCredits();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-surface-900/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <span className="text-sm font-bold text-white">B</span>
          </div>
          <span className="hidden text-sm font-bold text-white sm:block">BrandBloom</span>
        </Link>

        {/* Nav links — shown to authenticated users */}
        {status === "authenticated" && (
          <nav className="hidden items-center gap-6 text-sm text-stone-500 sm:flex">
            <Link href="/analyze" className="hover:text-white transition-colors">Create</Link>
            <Link href="/campaigns" className="hover:text-white transition-colors">Campaigns</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {status === "authenticated" ? (
            <>
              {/* Credit pill */}
              <CreditPill credits={credits} />

              {/* User menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-700 text-xs font-bold text-white ring-1 ring-white/10 hover:ring-brand-500/50 transition"
                  aria-label="User menu"
                >
                  {session?.user?.name?.slice(0, 1)?.toUpperCase() ?? session?.user?.email?.slice(0, 1)?.toUpperCase() ?? "U"}
                </button>

                {menuOpen && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    {/* Dropdown */}
                    <div className="absolute right-0 top-10 z-20 w-52 rounded-2xl border border-surface-600 bg-surface-800 py-1.5 shadow-2xl">
                      {session?.user?.email && (
                        <div className="border-b border-surface-600 px-4 py-3">
                          <p className="truncate text-xs text-stone-400">{session.user.email}</p>
                          {typeof credits === "number" && (
                            <p className="mt-0.5 text-xs font-semibold text-brand-400">⚡ {credits} credits</p>
                          )}
                        </div>
                      )}
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-stone-300 hover:bg-surface-700 hover:text-white transition-colors">
                        Dashboard
                      </Link>
                      <Link href="/analyze" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-stone-300 hover:bg-surface-700 hover:text-white transition-colors">
                        Create assets
                      </Link>
                      <Link href="/pricing" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-stone-300 hover:bg-surface-700 hover:text-white transition-colors">
                        Get credits
                      </Link>
                      <div className="border-t border-surface-600 mt-1.5 pt-1.5">
                        <button
                          type="button"
                          onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-stone-500 hover:bg-surface-700 hover:text-white transition-colors"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-stone-400 hover:text-white transition-colors sm:block">
                Sign in
              </Link>
              <Link href="/register" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400">
                Start free →
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Credit pill sub-component ────────────────────────────────────────────────
function CreditPill({ credits }: { credits: number | null }) {
  if (credits === null) return null;

  const empty = credits === 0;
  const low = credits <= 3 && credits > 0;

  return (
    <Link
      href="/pricing"
      title={empty ? "Out of credits — buy more" : low ? "Low credits — buy more" : `${credits} credits remaining`}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-80 ${
        empty
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : low
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-surface-500 bg-surface-800 text-stone-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${empty ? "bg-red-400" : low ? "bg-amber-400 animate-pulse" : "bg-brand-400"}`} />
      <span className="hidden sm:inline">
        {empty ? "Buy credits" : `${credits} credit${credits !== 1 ? "s" : ""}`}
        {low && !empty ? " · low" : ""}
      </span>
      <span className="sm:hidden">{credits}</span>
    </Link>
  );
}
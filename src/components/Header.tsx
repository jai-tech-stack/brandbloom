"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      fetch("/api/me")
        .then((r) => r.json())
        .then((d) => d.user && typeof d.user.credits === "number" && setCredits(d.user.credits))
        .catch(() => {});
    } else {
      setCredits(null);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    const handler = (e: CustomEvent<number>) => setCredits(e.detail);
    window.addEventListener("credits-updated", handler as EventListener);
    return () => window.removeEventListener("credits-updated", handler as EventListener);
  }, []);

  // After Stripe success, refetch credits and clean URL so balance and pricing stay correct
  useEffect(() => {
    if (typeof window === "undefined" || !session?.user?.email) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") !== "added") return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user && typeof d.user.credits === "number") setCredits(d.user.credits);
      })
      .catch(() => {});
    params.delete("credits");
    const qs = params.toString();
    const clean = (window.location.pathname || "/") + (qs ? `?${qs}` : "") + (window.location.hash || "");
    window.history.replaceState(null, "", clean);
  }, [session?.user?.email]);

  const links = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/campaign", label: "Campaign" },
  ];

  const navContent = (
    <>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="transition hover:text-white">
          {l.label}
        </Link>
      ))}
      {status === "loading" ? (
        <span className="text-stone-500">…</span>
      ) : session ? (
        <>
          {credits !== null && (
            <span className="text-stone-400">
              Credits: <strong className="text-white">{credits}</strong>
            </span>
          )}
          <Link
            href="/api/stripe/checkout"
            className="rounded-full border border-surface-500 px-3 py-1.5 text-sm text-stone-300 transition hover:border-brand-500 hover:text-white"
          >
            Buy credits
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-stone-400 transition hover:text-white"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="transition hover:text-white">
            Sign in
          </Link>
          <Link
            href="#get-started"
            className="rounded-full bg-brand-500 px-4 py-2 font-medium text-white transition hover:bg-brand-400"
          >
            Get started
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-surface-600/50 bg-surface-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <span className="text-xl font-bold tracking-tight">
            Brand<span className="text-brand-400">Bloom</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">{navContent}</nav>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-col gap-1.5 rounded p-2 text-stone-400 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          <span className={`h-0.5 w-6 bg-current transition ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`h-0.5 w-6 bg-current transition ${open ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-6 bg-current transition ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="border-t border-surface-600/50 bg-surface-900 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">{navContent}</div>
        </div>
      )}
    </header>
  );
}

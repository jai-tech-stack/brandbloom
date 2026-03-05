"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

/** Safely resolve callbackUrl — handles single and double encoding. */
function safeCallbackUrl(raw: string | null): string {
  if (!raw || typeof raw !== "string") return "/dashboard";

  // Decode up to 2 levels (handles double-encoding from NextAuth on Vercel)
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* ignore */ }
  // If still encoded, decode again
  if (decoded.includes("%2F") || decoded.includes("%3F")) {
    try { decoded = decodeURIComponent(decoded); } catch { /* ignore */ }
  }

  const withoutHash = decoded.split("#")[0] || "/dashboard";

  // Must be a relative path — no external redirects
  if (withoutHash.startsWith("/") && !withoutHash.startsWith("//")) {
    return withoutHash;
  }

  // Absolute URL — only allow same origin
  try {
    const u = new URL(decoded);
    if (typeof window !== "undefined" && u.origin !== window.location.origin) {
      return "/dashboard";
    }
    return (u.pathname + u.search) || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSession().then((session) => {
      setCheckingSession(false);
      if (session) {
        const callback = safeCallbackUrl(searchParams.get("callbackUrl"));
        window.location.replace(callback);
      }
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }
      if (!res?.ok) {
        setError("We couldn't sign you in. Please check your details and try again.");
        setLoading(false);
        return;
      }
      // Resolve callbackUrl and navigate — handles encoded /analyze?url=... correctly
      const callback = safeCallbackUrl(searchParams.get("callbackUrl"));
      window.location.replace(callback);
    } catch {
      setError("We couldn't complete sign-in. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-sm px-4 pt-32 pb-24">
        <h1 className="mb-2 text-2xl font-bold text-white">Sign in</h1>
        <p className="mb-8 text-stone-400">Use your account to get free credits and save brands.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-stone-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-stone-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-400 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          <Link href="/forgot-password" className="text-stone-400 hover:text-white">
            Forgot password?
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-stone-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-brand-400 hover:text-brand-300">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
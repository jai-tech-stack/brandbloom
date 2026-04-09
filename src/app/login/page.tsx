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

        {/* Google OAuth */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-surface-600 bg-surface-800 py-3 text-sm font-medium text-white transition hover:border-surface-500 hover:bg-surface-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 border-t border-surface-700" />
          <span className="text-xs text-stone-600">or</span>
          <div className="flex-1 border-t border-surface-700" />
        </div>

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
            className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 active:scale-[0.99] disabled:opacity-60"
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
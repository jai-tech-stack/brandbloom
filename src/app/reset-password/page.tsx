"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    // Verify token on mount
    fetch(`/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`)
      .then((r) => setTokenValid(r.ok))
      .catch(() => setTokenValid(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Reset failed. The link may have expired."); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  if (tokenValid === null) return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );

  if (tokenValid === false) return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 text-4xl">⛔</div>
        <h1 className="text-xl font-bold">Invalid or expired link</h1>
        <p className="mt-2 text-sm text-stone-400">This reset link has expired or already been used.</p>
        <Link href="/forgot-password" className="mt-5 block rounded-2xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-400 transition">
          Request a new link →
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold">B</div>
            <span className="font-bold">BrandBloom</span>
          </Link>
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="mt-2 text-sm text-stone-400">Minimum 8 characters.</p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-6 text-center">
            <div className="mb-3 text-3xl">✅</div>
            <p className="font-semibold">Password updated!</p>
            <p className="mt-1 text-sm text-stone-400">Redirecting you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-300">New password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters" autoFocus required minLength={8}
                className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-300">Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Same password again" required
                className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60">
              {loading ? "Updating…" : "Update password →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface-900"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>}><ResetForm /></Suspense>;
}
"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) { setError("Enter a valid email."); return; }
    setLoading(true); setError(null);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      setSent(true); // Always show success — don't leak if email exists
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold">B</div>
            <span className="font-bold">BrandBloom</span>
          </Link>
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
          <p className="mt-2 text-sm text-stone-400">Enter your email and we'll send a reset link.</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-6 text-center">
            <div className="mb-3 text-3xl">📬</div>
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-2 text-sm text-stone-400">
              If <span className="text-white">{email}</span> has an account, a reset link is on its way. Check spam too.
            </p>
            <Link href="/login" className="mt-5 block text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-300">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" autoFocus required
                className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60">
              {loading ? "Sending…" : "Send reset link →"}
            </button>
            <p className="text-center text-sm text-stone-500">
              Remembered it? <Link href="/login" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
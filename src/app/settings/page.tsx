"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [nameLoading, setNameLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setNameLoading(true); setNameMsg(null);
    try {
      const res = await fetch("/api/me/update", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setNameMsg({ ok: false, text: data.error ?? "Update failed." }); return; }
      await update({ name: name.trim() });
      setNameMsg({ ok: true, text: "Name updated successfully." });
    } catch { setNameMsg({ ok: false, text: "Something went wrong." }); }
    finally { setNameLoading(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setPwMsg({ ok: false, text: "New password must be at least 8 characters." }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "Passwords don't match." }); return; }
    setPwLoading(true); setPwMsg(null);
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setPwMsg({ ok: false, text: data.error ?? "Failed to change password." }); return; }
      setPwMsg({ ok: true, text: "Password updated successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch { setPwMsg({ ok: false, text: "Something went wrong." }); }
    finally { setPwLoading(false); }
  }

  if (!session) {
    router.push("/login?callbackUrl=/settings");
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Header />
      <div className="mx-auto max-w-xl px-4 pb-24 pt-28">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Account settings</h1>
          <p className="mt-1 text-sm text-stone-500">{session.user?.email}</p>
        </div>

        {/* Name */}
        <section className="mb-6 rounded-2xl border border-surface-600 bg-surface-800/40 p-6">
          <h2 className="mb-4 text-sm font-bold text-white">Display name</h2>
          <form onSubmit={saveName} className="space-y-4">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name" required
              className="w-full rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none" />
            {nameMsg && (
              <p className={`text-sm ${nameMsg.ok ? "text-brand-400" : "text-red-400"}`}>{nameMsg.text}</p>
            )}
            <button type="submit" disabled={nameLoading || !name.trim()}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50">
              {nameLoading ? "Saving…" : "Save name"}
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="mb-6 rounded-2xl border border-surface-600 bg-surface-800/40 p-6">
          <h2 className="mb-4 text-sm font-bold text-white">Change password</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password" required
              className="w-full rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none" />
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (min 8 characters)" required minLength={8}
              className="w-full rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none" />
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm new password" required
              className="w-full rounded-xl border border-surface-600 bg-surface-700 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:border-brand-500 focus:outline-none" />
            {pwMsg && (
              <p className={`text-sm ${pwMsg.ok ? "text-brand-400" : "text-red-400"}`}>{pwMsg.text}</p>
            )}
            <button type="submit" disabled={pwLoading}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50">
              {pwLoading ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="mb-2 text-sm font-bold text-red-400">Danger zone</h2>
          <p className="mb-4 text-xs text-stone-500">Deleting your account is permanent. All brands, assets, and credits will be lost.</p>
          <button type="button"
            onClick={() => { if (confirm("Are you sure? This cannot be undone.")) { fetch("/api/me/delete", { method: "DELETE", credentials: "include" }).then(() => router.push("/")); } }}
            className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10">
            Delete my account
          </button>
        </section>
      </div>
    </div>
  );
}
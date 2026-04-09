"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";

type Campaign = {
  id: string;
  title: string;
  goal: string;
  strategySummary: string;
  status: string;
  consistencyScore: number | null;
  duration: string | null;
  mode: string | null;
  createdAt: string;
  assetCount: number;
  brand: { id: string; name: string; domain: string; image: string | null } | null;
  assets: { id: string; url: string | null; label: string }[];
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete: "bg-green-500/15 text-green-300",
    generating: "bg-brand-500/15 text-brand-300",
    draft: "bg-surface-600 text-stone-400",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 8 ? "text-green-300" : score >= 6 ? "text-amber-300" : "text-red-300";
  return (
    <span className={`text-xs font-bold ${color}`}>
      {score.toFixed(1)}<span className="text-[10px] font-normal text-stone-600">/10</span>
    </span>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const thumb = campaign.assets.find((a) => a.url)?.url;
  const date = new Date(campaign.createdAt);
  const ago = (() => {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  })();

  return (
    <div className="group rounded-2xl border border-surface-700 bg-gradient-to-b from-surface-800 to-surface-800/90 p-5 ring-1 ring-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-surface-500 hover:shadow-xl hover:shadow-black/30">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-700">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl opacity-20">⚡</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{campaign.title}</h3>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-stone-500">{campaign.goal}</p>
          {campaign.brand && (
            <p className="mt-1 text-[11px] text-stone-600">{campaign.brand.name}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ScoreBadge score={campaign.consistencyScore} />
          <span className="text-[11px] text-stone-600">{ago}</span>
        </div>
      </div>

      {/* Summary */}
      {campaign.strategySummary && (
        <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-stone-500">
          {campaign.strategySummary}
        </p>
      )}

      {/* Asset strip */}
      {campaign.assets.length > 0 && (
        <div className="mt-3 flex gap-1.5 overflow-hidden">
          {campaign.assets.slice(0, 6).map((a) =>
            a.url ? (
              <img key={a.id} src={a.url} alt={a.label}
                className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            ) : (
              <div key={a.id} className="h-10 w-10 shrink-0 rounded-lg bg-surface-700" />
            )
          )}
          {campaign.assetCount > 6 && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-700 text-[10px] text-stone-500">
              +{campaign.assetCount - 6}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-stone-600">
          {campaign.assetCount} asset{campaign.assetCount !== 1 ? "s" : ""}
          {campaign.duration ? ` · ${campaign.duration}` : ""}
        </span>
        <Link href="/campaign"
          className="rounded-lg border border-surface-600 px-3 py-1.5 text-[11px] font-medium text-stone-400 transition hover:border-surface-500 hover:text-white">
          View →
        </Link>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { status } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/campaigns";
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/campaigns", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login?callbackUrl=/campaigns"; return null; }
        return r.json();
      })
      .then((d: { campaigns?: Campaign[] } | null) => {
        if (d?.campaigns) setCampaigns(d.campaigns);
      })
      .catch(() => setError("Failed to load campaigns."))
      .finally(() => setLoading(false));
  }, [status]);

  const complete = campaigns.filter((c) => c.status === "complete");
  const draft = campaigns.filter((c) => c.status !== "complete");

  return (
    <main className="min-h-screen bg-surface-900">
      <Header />
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-6">

        {/* Page header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
            <p className="mt-1 text-sm text-stone-500">
              {campaigns.length > 0
                ? `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""} · ${complete.length} complete`
                : "Plan and generate bulk brand assets"}
            </p>
          </div>
          <Link href="/campaign"
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 active:scale-[0.99]">
            + New Campaign
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && campaigns.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-surface-700 py-24 text-center">
            <p className="mb-2 text-lg font-semibold text-white">No campaigns yet</p>
            <p className="mb-6 text-sm text-stone-500">Create your first campaign to generate bulk brand assets.</p>
            <Link href="/campaign"
              className="inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400">
              Create campaign →
            </Link>
          </div>
        )}

        {!loading && campaigns.length > 0 && (
          <div className="space-y-8">
            {complete.length > 0 && (
              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">Completed</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {complete.map((c) => <CampaignCard key={c.id} campaign={c} />)}
                </div>
              </section>
            )}
            {draft.length > 0 && (
              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">In Progress</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {draft.map((c) => <CampaignCard key={c.id} campaign={c} />)}
                </div>
              </section>
            )}
          </div>
        )}

      </div>
    </main>
  );
}

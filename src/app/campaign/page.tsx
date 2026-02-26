"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";

type Brand = {
  id: string;
  name: string;
  domain: string;
  siteUrl: string;
  sourceType?: string | null;
};

type AssetPlanItem = {
  assetType: string;
  platform: string;
  purpose: string;
  headlineConcept: string;
  visualDirection: string;
  cta: string;
};

type PlanPreview = {
  campaignId: string;
  campaignName: string;
  objective: string;
  strategySummary: string;
  duration: string;
  assetPlan: AssetPlanItem[];
};

type CampaignAsset = {
  id: string;
  url: string | null;
  label: string;
  type: string;
  width: number;
  height: number;
  ideaType?: string | null;
  createdAt: string;
};

const GOAL_OPTIONS = [
  { value: "Launch product", label: "Launch product" },
  { value: "Increase sales", label: "Increase sales" },
  { value: "Grow social following", label: "Grow social following" },
  { value: "Build authority", label: "Build authority" },
  { value: "Event promotion", label: "Event promotion" },
  { value: "Seasonal campaign", label: "Seasonal campaign" },
];

const PLATFORM_OPTIONS = ["Instagram", "LinkedIn", "Facebook", "YouTube", "Pinterest", "Multi-platform"];

const TIMELINE_OPTIONS = [
  { value: "1 week", label: "1 week" },
  { value: "2 weeks", label: "2 weeks" },
  { value: "1 month", label: "1 month" },
  { value: "3 months", label: "3 months" },
];

const BUDGET_OPTIONS = [
  { value: "Organic only", label: "Organic only" },
  { value: "Small paid ads", label: "Small paid ads" },
  { value: "Aggressive paid ads", label: "Aggressive paid ads" },
];

export default function CampaignPage() {
  const { status } = useSession();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [briefMode, setBriefMode] = useState<null | "quick" | "advanced">(null);

  const [quickDescription, setQuickDescription] = useState("");
  const [advGoal, setAdvGoal] = useState(GOAL_OPTIONS[0].value);
  const [advPlatform, setAdvPlatform] = useState<string[]>([]);
  const [advTimeline, setAdvTimeline] = useState(TIMELINE_OPTIONS[0].value);
  const [advBudget, setAdvBudget] = useState(BUDGET_OPTIONS[0].value);
  const [advDescription, setAdvDescription] = useState("");

  const [urlGoal, setUrlGoal] = useState(GOAL_OPTIONS[0].value);

  const [isPlanning, setIsPlanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanPreview | null>(null);
  const [completedCampaign, setCompletedCampaign] = useState<{
    id: string;
    title: string;
    goal: string;
    strategySummary: string;
    assetPlanSnapshot: string | null;
    assets: CampaignAsset[];
    brand: { id: string; name: string; domain: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/brands", { credentials: "include" })
        .then((r) => {
          if (r.status === 401) {
            window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
            return null;
          }
          return r.json();
        })
        .then((data) => {
          if (data?.brands) {
            setBrands(data.brands);
            if (data.brands.length > 0 && !brandId) setBrandId(data.brands[0].id);
          }
        })
        .catch(() => setError("Failed to load brands"))
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, brandId]);

  const selectedBrand = brands.find((b) => b.id === brandId);
  const isUrlBrand = selectedBrand?.sourceType === "url";
  const isLogoBrand = selectedBrand?.sourceType === "logo";
  const skipBriefStep = isUrlBrand || (!!selectedBrand && selectedBrand.sourceType !== "logo");
  const requireBrief = isLogoBrand;
  const canSubmitLogoBrief =
    briefMode === "quick" ? !!quickDescription.trim() : briefMode === "advanced";

  async function handleGenerateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!brandId) {
      setError("Select a brand.");
      return;
    }
    setError(null);
    setPlanPreview(null);

    if (isUrlBrand) {
      setIsPlanning(true);
      try {
        const res = await fetch("/api/campaign/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ brandId, goal: urlGoal }),
        });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
          return;
        }
        if (!res.ok) {
          setError(data.error ?? "Campaign plan failed.");
          return;
        }
        setPlanPreview({
          campaignId: data.campaignId,
          campaignName: data.campaignName,
          objective: data.objective,
          strategySummary: data.strategySummary,
          duration: data.duration,
          assetPlan: data.assetPlan ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsPlanning(false);
      }
      return;
    }

    if (briefMode === "quick") {
      if (!quickDescription.trim()) {
        setError("Describe what you want to achieve.");
        return;
      }
      setIsPlanning(true);
      try {
        const res = await fetch("/api/campaign/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            brandId,
            brief: { type: "quick" as const, description: quickDescription.trim() },
          }),
        });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
          return;
        }
        if (!res.ok) {
          setError(data.error ?? "Campaign plan failed.");
          return;
        }
        setPlanPreview({
          campaignId: data.campaignId,
          campaignName: data.campaignName,
          objective: data.objective,
          strategySummary: data.strategySummary,
          duration: data.duration,
          assetPlan: data.assetPlan ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsPlanning(false);
      }
      return;
    }

    if (briefMode === "advanced") {
      setIsPlanning(true);
      try {
        const res = await fetch("/api/campaign/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            brandId,
            brief: {
              type: "advanced" as const,
              goal: advGoal,
              platform: advPlatform.length > 0 ? advPlatform : ["Multi-platform"],
              timeline: advTimeline,
              budget: advBudget,
              description: advDescription.trim() || undefined,
            },
          }),
        });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
          return;
        }
        if (!res.ok) {
          setError(data.error ?? "Campaign plan failed.");
          return;
        }
        setPlanPreview({
          campaignId: data.campaignId,
          campaignName: data.campaignName,
          objective: data.objective,
          strategySummary: data.strategySummary,
          duration: data.duration,
          assetPlan: data.assetPlan ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsPlanning(false);
      }
    }
  }

  async function handleGenerateAllAssets() {
    if (!planPreview) return;
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/campaign/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId: planPreview.campaignId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Asset generation failed.");
        return;
      }
      if (data.credits != null) {
        window.dispatchEvent(new CustomEvent("credits-updated", { detail: data.credits }));
      }
      setCompletedCampaign({
        id: data.campaign.id,
        title: data.campaign.title,
        goal: data.campaign.goal,
        strategySummary: data.campaign.strategySummary ?? "",
        assetPlanSnapshot: data.campaign.assetPlanSnapshot ?? null,
        assets: data.campaign.assets ?? [],
        brand: data.campaign.brand,
      });
      setPlanPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }

  function togglePlatform(p: string) {
    setAdvPlatform((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-lg px-4 pt-32 pb-24 text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">Sign in to create campaigns</h1>
          <p className="mb-8 text-stone-400">Plan and generate full marketing campaigns from your brand.</p>
          <Link href="/login" className="inline-block rounded-xl bg-brand-500 px-6 py-3 font-medium text-white hover:bg-brand-400">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Campaign</h1>
          <p className="mt-1 text-stone-400">Create a strategic campaign plan, then generate all assets.</p>
        </div>

        <div className="mb-6 rounded-xl border border-surface-600 bg-surface-800/50 p-4">
          <label className="mb-2 block text-sm font-medium text-stone-300">Brand</label>
          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setBriefMode(null);
              setPlanPreview(null);
            }}
            className="w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
          >
            {brands.length === 0 ? (
              <option value="">No brands — add one first</option>
            ) : (
              brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.domain})
                </option>
              ))
            )}
          </select>
        </div>

        {brandId && !planPreview && !completedCampaign && (
          <>
            {skipBriefStep && (
              <form onSubmit={handleGenerateCampaign} className="mb-8 rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                <p className="mb-4 text-stone-300">
                  Website intelligence detected. We&apos;ve analyzed your brand automatically.
                </p>
                <label className="mb-2 block text-sm font-medium text-stone-300">Campaign objective</label>
                <select
                  value={urlGoal}
                  onChange={(e) => setUrlGoal(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                  disabled={isPlanning}
                >
                  {GOAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {error && (
                  <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isPlanning}
                  className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                >
                  {isPlanning ? "Generating campaign…" : "Generate Campaign"}
                </button>
              </form>
            )}
            {requireBrief && briefMode === null && (
              <div className="mb-8 rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                <p className="mb-4 text-stone-300">
                  Since you don&apos;t have a website yet, we need a brief from you. Your campaign and assets will be generated <strong>only</strong> from this brief.
                </p>
                <h2 className="mb-4 text-lg font-semibold text-white">Tell us what you want to achieve right now</h2>
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => setBriefMode("quick")}
                    className="rounded-xl border-2 border-surface-500 px-6 py-4 text-left transition hover:border-brand-500 hover:bg-surface-700/50"
                  >
                    <span className="block font-medium text-white">Quick Mode</span>
                    <span className="mt-1 block text-sm text-stone-400">Single text box — describe your goal and we’ll plan the campaign.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBriefMode("advanced")}
                    className="rounded-xl border-2 border-surface-500 px-6 py-4 text-left transition hover:border-brand-500 hover:bg-surface-700/50"
                  >
                    <span className="block font-medium text-white">Advanced Mode</span>
                    <span className="mt-1 block text-sm text-stone-400">Goal, platform, timeline, budget — structured brief.</span>
                  </button>
                </div>
              </div>
            )}
            {requireBrief && briefMode !== null && (
              <form onSubmit={handleGenerateCampaign} className="mb-8 rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                <p className="mb-4 text-sm text-stone-400">Campaign and assets will be generated from this brief. Fill it in, then click Generate Campaign.</p>
                {briefMode === "quick" && (
                  <>
                    <label className="mb-2 block text-sm font-medium text-stone-300">What do you want to achieve?</label>
                    <textarea
                      value={quickDescription}
                      onChange={(e) => setQuickDescription(e.target.value)}
                      placeholder="Describe what you want to achieve. Example: Launching a premium cafe and want Instagram content to build hype."
                      rows={4}
                      className="mb-4 w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      disabled={isPlanning}
                    />
                  </>
                )}
                {briefMode === "advanced" && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-300">Goal</label>
                      <select
                        value={advGoal}
                        onChange={(e) => setAdvGoal(e.target.value)}
                        className="w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                        disabled={isPlanning}
                      >
                        {GOAL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-300">Platform</label>
                      <div className="flex flex-wrap gap-2">
                        {PLATFORM_OPTIONS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePlatform(p)}
                            className={`rounded-lg border px-3 py-1.5 text-sm ${advPlatform.includes(p) ? "border-brand-500 bg-brand-500/20 text-white" : "border-surface-500 text-stone-400 hover:border-surface-400"}`}
                            disabled={isPlanning}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-300">Timeline</label>
                      <select
                        value={advTimeline}
                        onChange={(e) => setAdvTimeline(e.target.value)}
                        className="w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                        disabled={isPlanning}
                      >
                        {TIMELINE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-300">Budget</label>
                      <select
                        value={advBudget}
                        onChange={(e) => setAdvBudget(e.target.value)}
                        className="w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                        disabled={isPlanning}
                      >
                        {BUDGET_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-stone-300">Extra details (optional)</label>
                      <textarea
                        value={advDescription}
                        onChange={(e) => setAdvDescription(e.target.value)}
                        placeholder="Any additional context..."
                        rows={2}
                        className="w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
                        disabled={isPlanning}
                      />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}
                <div className="mt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => { setBriefMode(null); setError(null); }}
                    className="rounded-lg border border-surface-500 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-surface-700"
                    disabled={isPlanning}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isPlanning || !canSubmitLogoBrief}
                    className="rounded-xl bg-brand-500 px-6 py-2 font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                  >
                    {isPlanning ? "Generating campaign…" : "Generate Campaign"}
                  </button>
                  {!canSubmitLogoBrief && briefMode === "quick" && (
                    <p className="mt-2 text-xs text-stone-500">Describe your goal above to enable generation.</p>
                  )}
                </div>
              </form>
            )}
          </>
        )}

        {planPreview && (
          <div className="mb-8 rounded-xl border border-surface-600 bg-surface-800/50 p-6">
            <h2 className="text-xl font-bold text-white">{planPreview.campaignName}</h2>
            <p className="mt-1 text-sm text-stone-400">Duration: {planPreview.duration}</p>
            <p className="mt-4 text-stone-300">{planPreview.strategySummary}</p>
            <h3 className="mt-6 text-lg font-semibold text-white">Planned assets</h3>
            <ul className="mt-3 space-y-3">
              {planPreview.assetPlan.map((item, i) => (
                <li key={i} className="rounded-lg border border-surface-600 bg-surface-800/50 p-3">
                  <p className="font-medium text-white">{item.assetType.replace(/_/g, " ")} · {item.platform}</p>
                  <p className="mt-1 text-sm text-stone-400">{item.purpose}</p>
                </li>
              ))}
            </ul>
            {error && (
              <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerateAllAssets}
              disabled={isGenerating}
              className="mt-6 w-full rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
            >
              {isGenerating ? "Generating…" : "Generate All Assets"}
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="mb-8 rounded-xl border border-surface-600 bg-surface-800/30 p-6">
            <p className="text-stone-300">Generating…</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-700">
              <div className="h-full w-2/3 animate-pulse bg-brand-500" />
            </div>
          </div>
        )}

        {completedCampaign && (
          <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
            <h2 className="text-xl font-bold text-white">Campaign Generated Successfully</h2>
            <p className="mt-2 text-stone-300">{completedCampaign.title}</p>
            {completedCampaign.strategySummary && (
              <p className="mt-4 text-stone-400">{completedCampaign.strategySummary}</p>
            )}
            {(() => {
              let purposes: AssetPlanItem[] = [];
              try {
                if (completedCampaign.assetPlanSnapshot) {
                  purposes = JSON.parse(completedCampaign.assetPlanSnapshot) as AssetPlanItem[];
                }
              } catch {
                // ignore
              }
              return purposes.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white">Why these assets were created</h3>
                  <ul className="mt-2 space-y-2">
                    {purposes.map((item, i) => (
                      <li key={i} className="text-sm text-stone-400">
                        <span className="font-medium text-stone-300">{item.assetType.replace(/_/g, " ")} ({item.platform}):</span> {item.purpose}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-semibold text-white">Assets</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedCampaign.assets.map((asset) => (
                  <div key={asset.id} className="overflow-hidden rounded-lg border border-surface-600 bg-surface-800/50">
                    <div className="relative aspect-square w-full bg-surface-700">
                      {asset.url ? (
                        <Image src={asset.url} alt={asset.label} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-stone-500">No image</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-white">{asset.label}</p>
                      <p className="text-xs text-stone-500">
                        {asset.ideaType?.replace(/_/g, " ") ?? asset.type} · {asset.width}×{asset.height}
                      </p>
                      {asset.url && (
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-brand-400 hover:text-brand-300"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <Link href="/dashboard" className="rounded-lg bg-surface-600 px-4 py-2 text-sm font-medium text-white hover:bg-surface-500">
                Back to Dashboard
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCompletedCampaign(null);
                  setError(null);
                  setBriefMode(null);
                  setPlanPreview(null);
                }}
                className="rounded-lg border border-surface-500 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-surface-700"
              >
                Create another campaign
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

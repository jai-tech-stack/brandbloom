"use client";

import { useEffect, useState, useRef } from "react";
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
  const [additionalPrompt, setAdditionalPrompt] = useState("");

  const [isPlanning, setIsPlanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanPreview | null>(null);
  const generateSubmittedRef = useRef(false);
  const generatingProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
  const brandsFetchedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || brandsFetchedRef.current) {
      if (status === "unauthenticated") setLoading(false);
      return;
    }
    brandsFetchedRef.current = true;
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
          if (data.brands.length > 0) setBrandId((prev) => prev || data.brands[0].id);
        }
      })
      .catch(() => setError("We couldn't load your brands. Please refresh the page."))
      .finally(() => setLoading(false));
  }, [status]);

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
      setError("Select a brand to continue.");
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
          body: JSON.stringify({
            brandId,
            goal: urlGoal,
            additionalPrompt: additionalPrompt.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
          return;
        }
        if (!res.ok) {
          setError(data.error ?? "We couldn't complete this step. Please try again; we're committed to fixing any recurring issues.");
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
        setError(err instanceof Error ? err.message : "We hit an issue on our side. Please try again.");
      } finally {
        setIsPlanning(false);
      }
      return;
    }

    if (briefMode === "quick") {
      if (!quickDescription.trim()) {
        setError("Describe your goal so we can plan the right assets.");
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
            additionalPrompt: additionalPrompt.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
          return;
        }
        if (!res.ok) {
          setError(data.error ?? "We couldn't complete this step. Please try again; we're committed to fixing any recurring issues.");
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
        setError(err instanceof Error ? err.message : "We hit an issue on our side. Please try again.");
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
            additionalPrompt: additionalPrompt.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
          return;
        }
        if (!res.ok) {
          setError(data.error ?? "We couldn't complete this step. Please try again; we're committed to fixing any recurring issues.");
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
        setError(err instanceof Error ? err.message : "We hit an issue on our side. Please try again.");
      } finally {
        setIsPlanning(false);
      }
    }
  }

  async function handleGenerateAllAssets() {
    if (!planPreview || generateSubmittedRef.current) return;
    generateSubmittedRef.current = true;
    setError(null);
    setIsGenerating(true);
    const total = Math.min(planPreview.assetPlan.length, 6);
    setGeneratingProgress({ current: 0, total });
    if (generatingProgressIntervalRef.current) clearInterval(generatingProgressIntervalRef.current);
    const progressInterval = setInterval(() => {
      setGeneratingProgress((prev) => {
        if (!prev || prev.current >= prev.total - 1) return prev;
        return { ...prev, current: prev.current + 1 };
      });
    }, 2500);
    generatingProgressIntervalRef.current = progressInterval;
    try {
      const res = await fetch("/api/campaign/generate-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId: planPreview.campaignId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        if (generatingProgressIntervalRef.current) clearInterval(generatingProgressIntervalRef.current);
        generatingProgressIntervalRef.current = null;
        generateSubmittedRef.current = false;
        setGeneratingProgress(null);
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/campaign");
        return;
      }
      if (!res.ok) {
        if (generatingProgressIntervalRef.current) clearInterval(generatingProgressIntervalRef.current);
        generatingProgressIntervalRef.current = null;
        setError(data.error ?? "We couldn't complete this step. Please try again; we're committed to fixing any recurring issues.");
        generateSubmittedRef.current = false;
        setGeneratingProgress(null);
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
      setGeneratingProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We hit an issue on our side. Please try again.");
      setGeneratingProgress(null);
    } finally {
      if (generatingProgressIntervalRef.current) clearInterval(generatingProgressIntervalRef.current);
      generatingProgressIntervalRef.current = null;
      setIsGenerating(false);
      generateSubmittedRef.current = false;
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
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-small text-stone-400">Loading your brands…</p>
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
          <h1 className="text-display font-bold text-white">Campaign</h1>
          <p className="mt-1 text-body text-stone-400">Create a strategic campaign plan, then generate assets. No new features — clarity and consistency.</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-surface-600 bg-surface-800/50 px-3 py-1.5 text-caption text-stone-400">
            <span aria-hidden>◇</span> Strategy powered by AI Brand Consultant
          </div>
          <p className="mt-2 text-caption text-stone-500">We&apos;re committed to accurate, on-brand results—no placeholders, no guesswork.</p>
        </div>

        {!completedCampaign && (
          <div className="mb-6 flex items-center gap-2 text-small text-stone-500">
            <span className="font-medium text-stone-400">
              Step {planPreview ? 4 : brandId && (skipBriefStep || (requireBrief && briefMode !== null)) ? (requireBrief && briefMode !== null ? 3 : 2) : 1} of 4
            </span>
          </div>
        )}

        <div className="mb-section rounded-xl border border-surface-600 bg-surface-800/50 p-6">
          <p className="mb-inline text-small text-stone-400">Which brand is this campaign for? This keeps strategy and assets aligned to one identity.</p>
          <label className="mb-2 mt-block block text-h2 font-medium text-stone-300">Brand</label>
          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setBriefMode(null);
              setPlanPreview(null);
            }}
            className="w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-body text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {brands.length === 0 ? (
              <option value="">Create your first brand</option>
            ) : (
              brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.domain})
                </option>
              ))
            )}
          </select>
          {brands.length === 0 && (
            <p className="mt-3 text-small text-stone-500">Add a brand from the Analyze page (enter your website) to run campaigns.</p>
          )}
        </div>

        {brandId && !planPreview && !completedCampaign && (
          <>
            {skipBriefStep && (
              <form onSubmit={handleGenerateCampaign} className="mb-8 rounded-xl border border-surface-600 bg-surface-800/50 p-6 transition-all duration-300 animate-fade-in">
                <p className="mb-block text-body text-stone-300">
                  Your campaign is built from your brand data (from your website). We use it to plan messaging and assets.
                </p>
                <label className="mb-inline mt-block block text-h2 font-medium text-stone-300">
                  What outcome do you want from this campaign?
                </label>
                <p className="mb-3 text-small text-stone-500">This helps us position your messaging and choose the right asset mix.</p>
                <select
                  value={urlGoal}
                  onChange={(e) => setUrlGoal(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-body text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  disabled={isPlanning}
                >
                  {GOAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <label className="mb-2 mt-block block text-h2 font-medium text-stone-300">
                  Any changes or specific direction? (optional)
                </label>
                <p className="mb-2 text-small text-stone-500">Add a prompt and our AI will use it to tailor the plan and outputs.</p>
                <textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder="e.g. Focus on B2B, more formal tone, highlight sustainability…"
                  rows={2}
                  className="mb-4 w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-body text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  disabled={isPlanning}
                />
                {error && (
                  <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-small text-red-200">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isPlanning}
                  className="w-full rounded-xl bg-brand-500 py-3 text-body font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                >
                  {isPlanning ? "Analyzing your brand positioning…" : "Generate campaign plan"}
                </button>
              </form>
            )}
            {requireBrief && briefMode === null && (
              <div className="mb-8 rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                <p className="mb-4 text-stone-300">
                  Since you don&apos;t have a website yet, we need a brief from you. Your campaign and assets will be generated <strong>only</strong> from this brief.
                </p>
                <h2 className="mb-inline mt-block text-h2 font-semibold text-white">How do you want to brief us?</h2>
                <p className="mb-4 text-small text-stone-500">Choose one. This keeps the process clear and intentional.</p>
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => setBriefMode("quick")}
                    className="rounded-xl border-2 border-surface-500 px-6 py-4 text-left transition hover:border-brand-500 hover:bg-surface-700/50"
                  >
                    <span className="block font-medium text-white">Quick</span>
                    <span className="mt-1 block text-sm text-stone-400">Single text box — describe your goal and we’ll plan the campaign.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBriefMode("advanced")}
                    className="rounded-xl border-2 border-surface-500 px-6 py-4 text-left transition hover:border-brand-500 hover:bg-surface-700/50"
                  >
                    <span className="block font-medium text-white">Advanced</span>
                    <span className="mt-1 block text-small text-stone-400">Goal, platform, timeline, budget — structured brief.</span>
                  </button>
                </div>
              </div>
            )}
            {requireBrief && briefMode !== null && (
              <form onSubmit={handleGenerateCampaign} className="mb-8 rounded-xl border border-surface-600 bg-surface-800/50 p-6">
                <p className="mb-4 text-small text-stone-500">Campaign and assets will be generated only from this brief.</p>
                {briefMode === "quick" && (
                  <>
                    <label className="mb-2 block text-h2 font-medium text-stone-300">What do you want to achieve?</label>
                    <p className="mb-2 text-small text-stone-500">Describe your goal in one paragraph. This helps us position your campaign and choose the right assets.</p>
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
                      <label className="mb-1 block text-h2 font-medium text-stone-300">What outcome do you want?</label>
                      <p className="mb-2 text-small text-stone-500">This helps us position your messaging correctly.</p>
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
                      <label className="mb-1 block text-h2 font-medium text-stone-300">Where will you use these assets?</label>
                      <p className="mb-2 text-small text-stone-500">Select one or more. This shapes format and messaging.</p>
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
                      <label className="mb-1 block text-h2 font-medium text-stone-300">What timeline are you working to?</label>
                      <p className="mb-2 text-small text-stone-500">Helps us scope the campaign and asset count.</p>
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
                      <label className="mb-1 block text-h2 font-medium text-stone-300">What’s your promotion budget?</label>
                      <p className="mb-2 text-small text-stone-500">Organic vs paid affects creative approach.</p>
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
                      <label className="mb-1 block text-h2 font-medium text-stone-300">Anything else we should know?</label>
                      <p className="mb-2 text-small text-stone-500">Optional. Audiences, offers, or constraints.</p>
                      <textarea
                        value={advDescription}
                        onChange={(e) => setAdvDescription(e.target.value)}
                        placeholder="e.g. target audience, key offer, do’s and don’ts…"
                        rows={2}
                        className="w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
                        disabled={isPlanning}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <label className="mb-1 block text-h2 font-medium text-stone-300">Any changes or specific direction? (optional)</label>
                  <p className="mb-2 text-small text-stone-500">Add a prompt and our AI will use it to tailor the plan and outputs.</p>
                  <textarea
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    placeholder="e.g. Focus on B2B, more formal tone, highlight sustainability…"
                    rows={2}
                    className="w-full rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-body text-white placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    disabled={isPlanning}
                  />
                </div>
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
                    className="rounded-xl bg-brand-500 px-6 py-2 text-body font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                  >
                    {isPlanning ? "Analyzing your brand positioning…" : "Generate campaign plan"}
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
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-surface-600 bg-surface-800/80 px-3 py-1.5 text-caption text-stone-400">
              <span aria-hidden>◇</span> Strategy powered by AI Brand Consultant
            </div>
            <h2 className="text-h1 font-bold text-white">Campaign overview</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-caption font-medium uppercase tracking-wide text-stone-500">Campaign name</dt>
                <dd className="mt-0.5 text-body font-medium text-white">{planPreview.campaignName}</dd>
              </div>
              <div>
                <dt className="text-caption font-medium uppercase tracking-wide text-stone-500">Objective</dt>
                <dd className="mt-0.5 text-body text-stone-300">{planPreview.objective}</dd>
              </div>
              <div>
                <dt className="text-caption font-medium uppercase tracking-wide text-stone-500">Duration</dt>
                <dd className="mt-0.5 text-body text-stone-300">{planPreview.duration}</dd>
              </div>
            </dl>
            <h3 className="mt-6 text-h2 font-semibold text-white">Why this strategy works</h3>
            <p className="mt-2 text-body text-stone-300">{planPreview.strategySummary}</p>
            <h3 className="mt-6 text-h2 font-semibold text-white">Planned assets</h3>
            <p className="mt-1 text-small text-stone-500">Each asset has a clear funnel role and business impact.</p>
            <ul className="mt-4 space-y-3">
              {(planPreview.assetPlan.slice(0, 6)).map((item, i) => (
                <li key={i} className="rounded-lg border border-surface-600 bg-surface-800/50 p-4">
                  <p className="text-body font-medium text-white">{item.assetType.replace(/_/g, " ")} · {item.platform}</p>
                  <p className="mt-1 text-caption font-medium uppercase tracking-wide text-stone-500">Purpose</p>
                  <p className="mt-0.5 text-small text-stone-300">{item.purpose}</p>
                  <p className="mt-2 text-caption font-medium uppercase tracking-wide text-stone-500">Business impact</p>
                  <p className="mt-0.5 text-small text-stone-400">Supports campaign objective and consistent brand presence.</p>
                </li>
              ))}
            </ul>
            {error && (
              <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-small text-red-200">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerateAllAssets}
              disabled={isGenerating}
              className="mt-6 w-full rounded-xl bg-brand-500 py-3 text-body font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
            >
              {isGenerating ? "Generating…" : "Approve & generate assets"}
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="mb-8 rounded-xl border border-surface-600 bg-surface-800/30 p-6">
            <p className="text-body font-medium text-stone-300">
              {generatingProgress ? `Designing campaign visuals… (${generatingProgress.current + 1} of ${generatingProgress.total})` : "Designing campaign visuals…"}
            </p>
            <p className="mt-1 text-small text-stone-500">This may take a minute. Do not refresh.</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-700">
              <div
                className="h-full bg-brand-500 transition-all duration-500"
                style={{ width: generatingProgress ? `${Math.round(((generatingProgress.current + 1) / generatingProgress.total) * 100)}%` : "33%" }}
              />
            </div>
          </div>
        )}

        {completedCampaign && (
          <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-6">
            <h2 className="text-h1 font-bold text-white">Campaign complete</h2>
            <p className="mt-2 text-body text-stone-300">{completedCampaign.title}</p>
            {completedCampaign.strategySummary && (
              <p className="mt-4 text-body text-stone-400">{completedCampaign.strategySummary}</p>
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
                  <h3 className="text-h2 font-semibold text-white">Why these assets were created</h3>
                  <ul className="mt-2 space-y-2">
                    {purposes.map((item, i) => (
                      <li key={i} className="text-small text-stone-400">
                        <span className="font-medium text-stone-300">{item.assetType.replace(/_/g, " ")} ({item.platform}):</span> {item.purpose}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
            <div className="mt-8">
              <h3 className="mb-4 text-h2 font-semibold text-white">Assets</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedCampaign.assets.map((asset) => (
                  <div key={asset.id} className="overflow-hidden rounded-lg border border-surface-600 bg-surface-800/50">
                    <div className="relative aspect-square w-full bg-surface-700">
                      {asset.url ? (
                        <Image src={asset.url} alt={asset.label} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-sm text-stone-500">This asset didn&apos;t generate. You can remove it or create a new campaign.</div>
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
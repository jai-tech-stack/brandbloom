"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INDUSTRIES = [
  "Technology", "Fashion & Apparel", "Food & Beverage", "Health & Wellness",
  "Beauty & Skincare", "Finance", "Real Estate", "Education",
  "Entertainment", "Sports & Fitness", "Travel", "Retail",
  "Professional Services", "Creative Agency", "Non-profit", "Other",
];

const TONES = [
  "Professional", "Bold & Confident", "Friendly & Approachable",
  "Minimalist & Clean", "Luxury & Premium", "Playful & Fun",
  "Innovative & Tech", "Organic & Natural", "Edgy & Disruptive",
];

const AUDIENCES = [
  "B2B / Enterprise", "Small businesses", "Startups",
  "Gen Z (18–25)", "Millennials (26–40)", "Gen X+ (40+)",
  "Creatives & designers", "Health-conscious", "Luxury buyers",
];

type Step = "upload" | "describe" | "processing" | "done";

const PROC_STEPS = [
  "Uploading logo…",
  "Analyzing colors and shapes…",
  "Building brand personality…",
  "Running logo generation strategy…",
  "Saving your Brand DNA…",
];

export default function CreateBrandPage() {
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [step, setStep] = useState<Step>("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  // Restore state when user returns from login with ?resume=1
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    const isResume = new URLSearchParams(window.location.search).get("resume") === "1";
    if (!isResume) return;
    resumedRef.current = true;
    try {
      const saved = sessionStorage.getItem("bb-logo-resume");
      if (!saved) return;
      const d = JSON.parse(saved) as { logoBase64?: string; mimeType?: string; brandName?: string; tagline?: string; industry?: string; tone?: string; targetAudience?: string; description?: string };
      sessionStorage.removeItem("bb-logo-resume");
      if (d.logoBase64) {
        setLogoBase64(d.logoBase64);
        // Reconstruct a preview data URL from base64
        setLogoPreview(`data:${d.mimeType ?? "image/png"};base64,${d.logoBase64.slice(0, 100000)}`);
      }
      if (d.brandName) setBrandName(d.brandName);
      if (d.tagline) setTagline(d.tagline);
      if (d.industry) setIndustry(d.industry);
      if (d.tone) setTones(d.tone.split(",").map((t: string) => t.trim()).filter(Boolean));
      if (d.targetAudience) setAudiences(d.targetAudience.split(",").map((a: string) => a.trim()).filter(Boolean));
      if (d.description) setDescription(d.description);
      // Skip to describe step since logo is restored
      setStep("describe");
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [industry, setIndustry] = useState("");
  const [tones, setTones] = useState<string[]>([]);
  const [audiences, setAudiences] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const [procStep, setProcStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function acceptFile(file: File) {
    setFileError(null);
    if (!file.type.startsWith("image/")) { setFileError("Please upload a PNG, JPG, SVG, or WebP."); return; }
    if (file.size > 10_000_000) { setFileError("File too large — please use an image under 10MB."); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setLogoBase64((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  }

  function toggleTone(t: string) {
    setTones((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t].slice(0, 4));
  }
  function toggleAud(a: string) {
    setAudiences((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a].slice(0, 3));
  }

  async function submit() {
    if (!logoBase64 || !brandName.trim()) { setError("Please upload a logo and enter your brand name."); return; }
    setStep("processing");
    setProcStep(0);
    setError(null);
    const tick = setInterval(() => setProcStep((p) => Math.min(p + 1, PROC_STEPS.length - 1)), 1400);
    try {
      const res = await fetch("/api/brands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method: "logo",
          logoBase64, logoMimeType: logoFile?.type ?? "image/png",
          brandName: brandName.trim(),
          tagline: tagline.trim() || undefined,
          industry: industry || undefined, tone: tones.join(", ") || undefined,
          targetAudience: audiences.join(", ") || undefined, description: description.trim() || undefined,
        }),
      });
      clearInterval(tick);
      if (res.status === 401) {
        try { sessionStorage.setItem("bb-logo-resume", JSON.stringify({ logoBase64, mimeType: logoFile?.type, brandName, tagline, industry, tone: tones.join(", "), targetAudience: audiences.join(", "), description })); } catch { /* */ }
        router.push(`/login?callbackUrl=${encodeURIComponent("/create-brand?resume=1")}`);
        return;
      }
      const data = await res.json().catch(() => ({})) as { success?: boolean; data?: { brandId?: string }; error?: string };
      if (!res.ok || !data.success) { setError(data.error ?? "Brand creation failed. Please try again."); setStep("describe"); return; }
      if (data.data?.brandId) {
        setProcStep(PROC_STEPS.length - 1);
        setStep("done");
        setTimeout(() => router.push(`/analyze?brandId=${data.data?.brandId}&stage=review`), 1000);
      }
    } catch (e) {
      clearInterval(tick);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("describe");
    }
  }

  const NavBar = ({ right }: { right?: React.ReactNode }) => (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-surface-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">B</div>
          <span className="text-sm font-bold text-white">BrandBloom</span>
        </Link>
        {right}
      </div>
    </nav>
  );

  if (step === "upload") return (
    <div className="min-h-screen bg-surface-900 text-white">
      <NavBar right={<Link href="/login" className="text-sm text-stone-500 hover:text-white transition-colors">Sign in</Link>} />
      <div className="mx-auto max-w-lg px-4 pb-24 pt-28">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-block text-xs text-stone-600 hover:text-stone-400">← Back to home</Link>
          <h1 className="text-3xl font-bold text-white">Start with your logo</h1>
          <p className="mt-2 text-sm text-stone-500">No website needed. Upload your logo and we'll build your full Brand DNA — colors, fonts, tone, personality, and more.</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) acceptFile(f); }}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-14 text-center transition-all ${drag ? "border-brand-500 bg-brand-500/10" : "border-surface-600 hover:border-brand-500/40 hover:bg-surface-800/40"}`}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />
          {logoPreview ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-xl object-contain border border-surface-500 bg-surface-700 p-2" />
              <div>
                <p className="font-semibold text-white">{logoFile?.name}</p>
                <p className="text-xs text-stone-600">{((logoFile?.size ?? 0) / 1024).toFixed(0)} KB · Click to replace</p>
              </div>
              <span className="text-xs text-brand-400">✓ Logo ready</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-700 text-3xl">🖼️</div>
              <div>
                <p className="font-semibold text-white">Drop your logo here</p>
                <p className="mt-1 text-xs text-stone-600">or click to browse</p>
                <p className="mt-0.5 text-xs text-stone-700">PNG, JPG, SVG, WebP · max 10MB</p>
              </div>
            </div>
          )}
        </div>

        {fileError && <p className="mt-3 text-sm text-red-400">{fileError}</p>}

        <div className="mt-5 space-y-3">
          <button type="button" disabled={!logoPreview} onClick={() => setStep("describe")}
            className="w-full rounded-2xl bg-brand-500 py-3.5 font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40">
            Continue →
          </button>
          <p className="text-center text-xs text-stone-600">
            Have a website?{" "}
            <Link href="/" className="text-brand-400 underline underline-offset-2 hover:text-brand-300">Use URL extraction instead</Link>
          </p>
        </div>
      </div>
    </div>
  );

  if (step === "describe") return (
    <div className="min-h-screen bg-surface-900 text-white">
      <NavBar right={<span className="text-xs text-stone-600">Step 2 of 2</span>} />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-28">
        <div className="mb-8 flex items-center gap-4">
          {logoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-surface-500 bg-surface-700 p-1.5 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">Tell us about your brand</h1>
            <p className="text-sm text-stone-500">The more you share, the better the generated assets.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-300">Brand name <span className="text-red-500">*</span></label>
            <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Volta Coffee" autoFocus
              className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-sm text-white placeholder:text-stone-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-300">Tagline <span className="text-stone-600 font-normal">(optional)</span></label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Fuel your momentum"
              className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-sm text-white placeholder:text-stone-700 focus:border-brand-500 focus:outline-none" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-300">Industry <span className="text-stone-600 font-normal">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((opt) => (
                <button key={opt} type="button" onClick={() => setIndustry(industry === opt ? "" : opt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${industry === opt ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-300">Brand tone <span className="text-stone-600 font-normal">(up to 4)</span></label>
            <p className="mb-2 text-xs text-stone-600">Shapes the style and mood of every generated asset.</p>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button key={t} type="button" onClick={() => toggleTone(t)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${tones.includes(t) ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-300">Target audience <span className="text-stone-600 font-normal">(up to 3)</span></label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AUDIENCES.map((a) => (
                <button key={a} type="button" onClick={() => toggleAud(a)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${audiences.includes(a) ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-surface-600 text-stone-500 hover:border-surface-500 hover:text-stone-300"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-300">What does your brand do? <span className="text-stone-600 font-normal">(optional but recommended)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="What you do, who you serve, what makes you different…"
              className="w-full resize-none rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 text-sm text-white placeholder:text-stone-700 focus:border-brand-500 focus:outline-none" />
          </div>

          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep("upload")}
              className="rounded-xl border border-surface-500 px-5 py-3 text-sm font-medium text-stone-400 transition hover:text-white">
              ← Back
            </button>
            <button type="button" disabled={!brandName.trim()} onClick={submit}
              className="flex-1 rounded-2xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40">
              Build my Brand DNA →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (step === "processing") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-900 px-4 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto mb-8 h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-2 animate-ping rounded-full bg-brand-500/10" style={{ animationDuration: "1.5s", animationDelay: "0.4s" }} />
          {logoPreview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoPreview} alt="" className="relative z-10 h-20 w-20 rounded-2xl border border-surface-500 bg-surface-700 p-2 object-contain" />
            : <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500 text-3xl">🧬</div>
          }
        </div>
        <h1 className="mb-1 text-2xl font-bold">Building your Brand DNA…</h1>
        <p className="mb-8 text-sm text-stone-500">{brandName}</p>
        <div className="space-y-2.5">
          {PROC_STEPS.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-500 ${
              i < procStep ? "border-brand-500/25 bg-brand-500/10 text-brand-300"
              : i === procStep ? "border-surface-500 bg-surface-800 text-white"
              : "border-surface-700 bg-surface-900/30 text-stone-700"}`}>
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                i < procStep ? "bg-brand-500 text-white" : i === procStep ? "border-2 border-brand-500" : "border border-surface-600"}`}>
                {i < procStep ? "✓" : i === procStep ? <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> : null}
              </div>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-900 px-4 text-white">
      <div className="text-center">
        <div className="mb-4 text-5xl">✨</div>
        <h1 className="mb-2 text-3xl font-bold">Brand DNA ready!</h1>
        <p className="text-sm text-stone-500">Taking you to your brand kit…</p>
      </div>
    </div>
  );
}
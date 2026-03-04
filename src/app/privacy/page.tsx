import Link from "next/link";

export default function PrivacyPage() {
  const sections = [
    { title: "1. What we collect", body: "Email address and name (for your account). Website URLs you submit for brand extraction. Logo and image files you upload. Generated assets and brand profiles. Payment info is handled by Stripe — we never store card details. Usage data (pages visited, generations made) for product improvement." },
    { title: "2. How we use it", body: "To operate the service: process your brand extractions and generate assets. To manage your account and credits. To send transactional emails (payment confirmations, low-credit warnings, password resets). To improve our AI models and extraction accuracy using anonymized, aggregated data." },
    { title: "3. Data sharing", body: "We do not sell your data. We share data only with: Stripe (payment processing), Anthropic / OpenAI / Replicate (AI processing — only your prompts and images, not personal details), Vercel (hosting), our database provider. All processors are bound by data processing agreements." },
    { title: "4. Data retention", body: "Your account data is retained as long as your account is active. Generated assets are stored for 90 days then automatically deleted unless you download them. Brand profiles are stored until you delete them. On account deletion, all data is removed within 30 days." },
    { title: "5. Cookies", body: "We use session cookies for authentication only. We do not use advertising or tracking cookies. We do not use third-party analytics that track you across the web." },
    { title: "6. Your rights", body: "You can: export your data (email us), delete your account (Settings → Danger zone), request correction of your data, opt out of marketing emails (unsubscribe link in every email). For GDPR/CCPA requests, email privacy@brandbloom.ai." },
    { title: "7. Security", body: "Passwords are hashed with bcrypt. All data in transit is encrypted via TLS. We use industry-standard security practices. If we discover a breach affecting your data, we'll notify you within 72 hours." },
    { title: "8. Children", body: "BrandBloom is not directed at children under 13. We do not knowingly collect data from children. If you believe we have collected data from a child, please contact us immediately." },
    { title: "9. Contact", body: "For privacy questions: privacy@brandbloom.ai" },
  ];

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-surface-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold">B</div>
            <span className="text-sm font-bold">BrandBloom</span>
          </Link>
          <Link href="/" className="text-sm text-stone-400 hover:text-white transition-colors">← Home</Link>
        </div>
      </nav>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-28">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-stone-500">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="mb-2 text-base font-bold text-white">{s.title}</h2>
              <p className="text-sm leading-relaxed text-stone-400">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-surface-600 pt-8 text-sm text-stone-600">
          <Link href="/terms" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">Terms of Service</Link>
          {" · "}
          <Link href="/" className="hover:text-stone-400 transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}
// src/lib/email.ts
// Resend-only implementation — no nodemailer, no SMTP, no extra packages needed.

const FROM = process.env.EMAIL_FROM ?? "BrandBloom <noreply@brandbloom.vercel.app>";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://brandbloom.vercel.app/";

async function send(to: string, subject: string, html: string) {
  if (!to) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback — log to console so build never fails
    console.log(`\n📧 [Email - RESEND_API_KEY not set]\nTo: ${to}\nSubject: ${subject}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[email] Resend error sending to ${to}:`, err);
    // Don't throw — email failure should never crash a user-facing flow
  }
}

function baseLayout(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#0c0a09;color:#e7e5e4;margin:0;padding:0}
.wrap{max-width:520px;margin:0 auto;padding:40px 20px}
.card{background:#1c1917;border:1px solid #292524;border-radius:16px;padding:32px}
.logo{font-size:18px;font-weight:800;color:#ea751d;margin-bottom:24px}
h1{font-size:22px;font-weight:700;color:#fff;margin:0 0 12px}
p{font-size:14px;line-height:1.6;color:#a8a29e;margin:0 0 16px}
.btn{display:inline-block;background:#ea751d;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:12px;margin:8px 0}
.footer{margin-top:24px;font-size:11px;color:#57534e;text-align:center}
.divider{border:none;border-top:1px solid #292524;margin:24px 0}
</style></head><body><div class="wrap">${content}
<div class="footer">© ${new Date().getFullYear()} BrandBloom &middot;
<a href="${APP_URL}/privacy" style="color:#57534e">Privacy</a> &middot;
<a href="${APP_URL}/terms" style="color:#57534e">Terms</a>
</div></div></body></html>`;
}

export async function sendWelcomeEmail({ to, name }: { to: string; name?: string }) {
  const firstName = name?.split(" ")[0] ?? "there";
  await send(to, "Welcome to BrandBloom 🌸", baseLayout(`<div class="card">
    <div class="logo">BrandBloom</div>
    <h1>Welcome, ${firstName}! 🎉</h1>
    <p>Your account is ready. You have <strong style="color:#ea751d">10 free credits</strong> waiting.</p>
    <p>① Paste your website URL or upload your logo<br>② Review your Brand DNA<br>③ Generate assets for any platform</p>
    <a href="${APP_URL}/analyze" class="btn">Start creating →</a>
    <hr class="divider">
    <p style="font-size:12px">Questions? Reply to this email — we read every one.</p>
  </div>`));
}

export async function sendPasswordResetEmail({ to, name, resetUrl }: { to: string; name?: string; resetUrl: string }) {
  const firstName = name?.split(" ")[0] ?? "there";
  await send(to, "Reset your BrandBloom password", baseLayout(`<div class="card">
    <div class="logo">BrandBloom</div>
    <h1>Reset your password</h1>
    <p>Hey ${firstName}, click below to reset your password. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset password →</a>
    <hr class="divider">
    <p style="font-size:12px;color:#57534e">If you didn't request this, ignore this email. Your password won't change.</p>
  </div>`));
}

export async function sendLowCreditsEmail({ to, name, credits }: { to: string; name?: string; credits: number }) {
  const firstName = name?.split(" ")[0] ?? "there";
  await send(to, `You have ${credits} credits left — top up to keep creating`, baseLayout(`<div class="card">
    <div class="logo">BrandBloom</div>
    <h1>Running low on credits ⚡</h1>
    <p>Hey ${firstName}, you have <strong style="color:#fbbf24">${credits} credit${credits !== 1 ? "s" : ""}</strong> remaining.</p>
    <a href="${APP_URL}/pricing" class="btn">Get more credits →</a>
    <hr class="divider">
    <p style="font-size:12px">Credits never expire. <a href="${APP_URL}/pricing" style="color:#ea751d">View plans</a></p>
  </div>`));
}

export async function sendPaymentConfirmationEmail({ to, name, credits, amount }: { to: string; name?: string; credits: number; amount: number }) {
  const firstName = name?.split(" ")[0] ?? "there";
  await send(to, `${credits} credits added to your BrandBloom account`, baseLayout(`<div class="card">
    <div class="logo">BrandBloom</div>
    <h1>Payment confirmed ✅</h1>
    <p>Thanks ${firstName}! <strong style="color:#ea751d">${credits} credits</strong> for $${amount} have been added to your account.</p>
    <a href="${APP_URL}/analyze" class="btn">Start generating →</a>
    <hr class="divider">
    <p style="font-size:12px;color:#57534e">Stripe will send a separate payment receipt to this address.</p>
  </div>`));
}
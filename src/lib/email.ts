/**
 * Transactional email via Resend (preferred) or SMTP fallback.
 * Add RESEND_API_KEY to .env for Resend (free tier: 100 emails/day).
 * Or set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS for any SMTP provider.
 */

const FROM = process.env.EMAIL_FROM ?? "BrandBloom <noreply@brandbloom.ai>";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://brandbloom.ai";

async function sendViaResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

async function sendViaSMTP(to: string, subject: string, html: string) {
  // Dynamically import nodemailer only when needed
  const nodemailer = await import("nodemailer").catch(() => null);
  if (!nodemailer) throw new Error("nodemailer not installed. Run: npm install nodemailer");

  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({ from: FROM, to, subject, html });
}

async function send(to: string, subject: string, html: string) {
  if (!to) return;
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html);
  } else if (process.env.SMTP_HOST) {
    await sendViaSMTP(to, subject, html);
  } else {
    // Dev mode — log to console
    console.log(`\n📧 [Email not configured — would send to ${to}]\nSubject: ${subject}\n`);
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

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
.stat{display:inline-block;background:#292524;border-radius:10px;padding:12px 20px;margin:4px}
.stat-num{font-size:24px;font-weight:800;color:#ea751d}
.stat-label{font-size:11px;color:#78716c;margin-top:2px}
</style></head><body><div class="wrap">${content}<div class="footer">© ${new Date().getFullYear()} BrandBloom · <a href="${APP_URL}/privacy" style="color:#57534e">Privacy</a> · <a href="${APP_URL}/terms" style="color:#57534e">Terms</a></div></div></body></html>`;
}

// 1. Welcome email on signup
export async function sendWelcomeEmail({ to, name }: { to: string; name?: string }) {
  const firstName = name?.split(" ")[0] ?? "there";
  const html = baseLayout(`<div class="card">
    <div class="logo">BrandBloom</div>
    <h1>Welcome, ${firstName}! 🎉</h1>
    <p>Your account is ready. You have <strong style="color:#ea751d">10 free credits</strong> waiting — enough to generate your first on-brand assets.</p>
    <p>Here's what to do next:</p>
    <p>① Paste your website URL or upload your logo<br>② Review your extracted Brand DNA<br>③ Generate assets for any platform in seconds</p>
    <a href="${APP_URL}/analyze" class="btn">Start creating →</a>
    <hr class="divider">
    <p style="font-size:12px">Questions? Reply to this email — we read every one.</p>
  </div>`);
  await send(to, "Welcome to BrandBloom 🌸", html);
}

// 2. Password reset email
export async function sendPasswordResetEmail({ to, name, resetUrl }: { to: string; name?: string; resetUrl: string }) {
  const firstName = name?.split(" ")[0] ?? "there";
  const html = baseLayout(`<div class="card">
    <div class="logo">BrandBloom</div>
    <h1>Reset your password</h1>
    <p>Hey ${firstName}, we received a request to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset password →</a>
    <hr class="divider">
    <p style="font-size:12px;color:#57534e">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
  </div>`);
  await send(to, "Reset your BrandBloom password", html);
}

// 3. Low credit warning (sent at 3 credits remaining)
export async function sendLowCreditsEmail({ to, name, credits }: { to: string; name?: string; credits: number }) {
  const firstName = name?.split(" ")[0] ?? "there";
  const html = baseLayout(`<div class="card">
    <div class="logo">BrandBloom</div>
    <h1>You're running low on credits ⚡</h1>
    <p>Hey ${firstName}, you have <strong style="color:#fbbf24">${credits} credit${credits !== 1 ? "s" : ""}</strong> remaining. That's enough for ${credits} more standard generation${credits !== 1 ? "s" : ""}.</p>
    <a href="${APP_URL}/pricing" class="btn">Get more credits →</a>
    <hr class="divider">
    <p style="font-size:12px">Top up anytime — credits never expire. <a href="${APP_URL}/pricing" style="color:#ea751d">View plans</a></p>
  </div>`);
  await send(to, `You have ${credits} credits left — top up to keep creating`, html);
}

// 4. Payment confirmation
export async function sendPaymentConfirmationEmail({ to, name, credits, amount }: { to: string; name?: string; credits: number; amount: number }) {
  const firstName = name?.split(" ")[0] ?? "there";
  const html = baseLayout(`<div class="card">
    <div class="logo">BrandBloom</div>
    <h1>Payment confirmed ✅</h1>
    <p>Thanks ${firstName}! Your purchase of <strong style="color:#ea751d">${credits} credits</strong> for $${amount} has been processed.</p>
    <div style="text-align:center;margin:20px 0">
      <div class="stat"><div class="stat-num">⚡ ${credits}</div><div class="stat-label">Credits added</div></div>
    </div>
    <a href="${APP_URL}/analyze" class="btn">Start generating →</a>
    <hr class="divider">
    <p style="font-size:12px;color:#57534e">Receipt: Stripe will send a separate payment receipt to this email address.</p>
  </div>`);
  await send(to, `${credits} credits added to your BrandBloom account`, html);
}

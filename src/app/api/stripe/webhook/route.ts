// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { sendPaymentConfirmationEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

// Map Stripe price IDs → credits to grant
// Set these in your .env to match your Stripe dashboard
function creditsForPrice(priceId: string): number {
  const map: Record<string, number> = {
    [process.env.STRIPE_PRICE_STARTER ?? "price_starter"]: 50,
    [process.env.STRIPE_PRICE_POPULAR ?? "price_popular"]: 200,
    [process.env.STRIPE_PRICE_PRO ?? "price_pro"]: 500,
    [process.env.STRIPE_PRICE_SUB_PRO ?? "price_sub_pro"]: 200,       // monthly reset
    [process.env.STRIPE_PRICE_SUB_AGENCY ?? "price_sub_agency"]: 9999, // unlimited = large number
  };
  return map[priceId] ?? 0;
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe/webhook] signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    // ── One-time payment success ──────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") return NextResponse.json({ received: true });

      const userId = session.metadata?.userId;
      if (!userId) {
        console.error("[stripe/webhook] no userId in session metadata");
        return NextResponse.json({ received: true });
      }

      // Get the price ID from the line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
      const priceId = lineItems.data[0]?.price?.id ?? "";
      const credits = creditsForPrice(priceId);

      if (credits > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: credits } },
        });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.email) {
          sendPaymentConfirmationEmail({
            to: user.email,
            name: user.name ?? undefined,
            credits,
            amount: (session.amount_total ?? 0) / 100,
          }).catch(console.error);
        }
        console.info(`[stripe/webhook] ✓ Credited ${credits} credits to user ${userId} (price: ${priceId})`);
      } else {
        console.warn(`[stripe/webhook] Unknown price ID: ${priceId} — no credits granted`);
      }
    }

    // ── Subscription renewal ──────────────────────────────────────────────────
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;

      // Only process subscription renewals (not the initial checkout — that's handled above)
      if (invoice.billing_reason === "subscription_cycle") {
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) return NextResponse.json({ received: true });

        // Find user by Stripe customer ID — you need to store this on first checkout
        // For now, look up by email from the invoice
        const customerEmail = invoice.customer_email;
        if (!customerEmail) return NextResponse.json({ received: true });

        const priceId = invoice.lines.data[0]?.price?.id ?? "";
        const credits = creditsForPrice(priceId);

        if (credits > 0) {
          // Reset to subscription amount (not increment) for monthly plans
          await prisma.user.updateMany({
            where: { email: customerEmail },
            data: { credits },
          });
          console.info(`[stripe/webhook] ✓ Reset ${credits} credits for subscription renewal (${customerEmail})`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[stripe/webhook] handler error:", e);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

// Stripe requires the raw body — disable Next.js body parsing
export const config = { api: { bodyParser: false } };
// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function creditsForPrice(priceId: string): number {
  const map: Record<string, number> = {
    [process.env.STRIPE_PRICE_STARTER ?? "price_starter"]: 50,
    [process.env.STRIPE_PRICE_POPULAR ?? "price_popular"]: 200,
    [process.env.STRIPE_PRICE_PRO ?? "price_pro"]: 500,
    [process.env.STRIPE_PRICE_SUB_PRO ?? "price_sub_pro"]: 200,
    [process.env.STRIPE_PRICE_SUB_AGENCY ?? "price_sub_agency"]: 9999,
  };
  return map[priceId] ?? 0;
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 500 });
  }

  // Lazy init — never runs at module load time
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
  });

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe/webhook] signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status !== "paid") return NextResponse.json({ received: true });

      const userId = session.metadata?.userId;
      if (!userId) return NextResponse.json({ received: true });

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
      const priceId = lineItems.data[0]?.price?.id ?? "";
      const credits = creditsForPrice(priceId);

      if (credits > 0) {
        await prisma.user.update({ where: { id: userId }, data: { credits: { increment: credits } } });
        console.info(`[stripe/webhook] ✓ +${credits} credits → user ${userId}`);

        // Send payment confirmation email
        try {
          const { sendPaymentConfirmationEmail } = await import("@/lib/email");
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user?.email) {
            await sendPaymentConfirmationEmail({
              to: user.email,
              name: user.name ?? undefined,
              credits,
              amount: (session.amount_total ?? 0) / 100,
            });
          }
        } catch { /* email failure never blocks webhook */ }
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      if (invoice.billing_reason === "subscription_cycle") {
        const customerEmail = invoice.customer_email;
        if (!customerEmail) return NextResponse.json({ received: true });
        const priceId = invoice.lines.data[0]?.price?.id ?? "";
        const credits = creditsForPrice(priceId);
        if (credits > 0) {
          await prisma.user.updateMany({ where: { email: customerEmail }, data: { credits } });
          console.info(`[stripe/webhook] ✓ Reset ${credits} credits for ${customerEmail}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[stripe/webhook] handler error:", e);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
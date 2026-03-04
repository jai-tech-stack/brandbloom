// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/resolve-auth-user";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
    }

    // Initialize Stripe lazily inside the handler — never at module load time
    // This prevents build crashes when STRIPE_SECRET_KEY is not set during build
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { priceId?: string; mode?: string };
    const { priceId, mode } = body;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID required." }, { status: 400 });
    }

    const checkoutMode = mode === "subscription" ? "subscription" : "payment";
    const origin = request.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: authUser.email,
      metadata: {
        userId: authUser.id,
        userEmail: authUser.email,
      },
      success_url: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?cancelled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/checkout] error:", e);
    const msg = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
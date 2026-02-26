import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripeCreditsAmount } from "@/lib/credits";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const CREDITS_PRICE_ID = process.env.STRIPE_CREDITS_PRICE_ID ?? "";

export async function GET(request: NextRequest) {
  if (!stripe || !CREDITS_PRICE_ID) {
    const origin = request.nextUrl?.origin ?? new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/`);
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const origin = request.nextUrl?.origin ?? new URL(request.url).origin;
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: CREDITS_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${origin}/?credits=added`,
      cancel_url: `${origin}/`,
      client_reference_id: user.id,
      metadata: { credits: String(getStripeCreditsAmount()), userId: user.id },
    });
    if (checkoutSession.url) {
      return NextResponse.redirect(checkoutSession.url);
    }
  } catch (e) {
    console.error("Stripe checkout error:", e);
  }
  return NextResponse.redirect(`${origin}/`);
}

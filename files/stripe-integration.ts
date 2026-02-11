// src/lib/stripe.ts

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const STRIPE_PLANS = {
  FREE: {
    name: 'Free',
    credits: 10,
    price: 0,
  },
  PRO: {
    name: 'Pro',
    credits: 100,
    price: 20,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  BUSINESS: {
    name: 'Business',
    credits: 300,
    price: 50,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
  },
};

// src/server/api/routers/subscription.ts

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { stripe, STRIPE_PLANS } from '@/lib/stripe';
import { TRPCError } from '@trpc/server';

export const subscriptionRouter = createTRPCRouter({
  /**
   * Create checkout session
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(['PRO', 'BUSINESS']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.userId;
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const plan = STRIPE_PLANS[input.plan];
      if (!plan.priceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid plan',
        });
      }

      // Create or get Stripe customer
      let customerId = user.subscription?.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        metadata: {
          userId: user.id,
          plan: input.plan,
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  /**
   * Create portal session for managing subscription
   */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.userId },
      include: { subscription: true },
    });

    if (!user?.subscription?.stripeCustomerId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No subscription found',
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    });

    return {
      url: session.url,
    };
  }),

  /**
   * Get current subscription
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.db.subscription.findUnique({
      where: {
        userId: ctx.session.userId,
      },
    });

    return subscription;
  }),
});

// src/app/api/webhooks/stripe/route.ts

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/server/db';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const session = event.data.object as any;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(session);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(session);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    throw new Error('Missing metadata in checkout session');
  }

  const subscriptionId = session.subscription;
  const customerId = session.customer;

  // Get subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update or create subscription
  await db.subscription.upsert({
    where: { userId },
    update: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan,
      status: subscription.status,
      monthlyCredits: STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS].credits,
    },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan,
      status: subscription.status,
      monthlyCredits: STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS].credits,
    },
  });

  // Add credits
  const credits = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS].credits;
  await db.user.update({
    where: { id: userId },
    data: {
      credits: {
        increment: credits,
      },
    },
  });

  // Record transaction
  await db.creditTransaction.create({
    data: {
      userId,
      amount: credits,
      type: 'subscription',
      description: `${plan} plan activated - ${credits} credits`,
    },
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  await db.subscription.update({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    data: {
      status: subscription.status,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: any) {
  await db.subscription.update({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    data: {
      status: 'canceled',
    },
  });
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const subscriptionId = invoice.subscription;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const dbSubscription = await db.subscription.findUnique({
    where: {
      stripeSubscriptionId: subscription.id,
    },
  });

  if (!dbSubscription) return;

  // Refill credits at the start of each billing period
  const plan = dbSubscription.plan;
  const credits = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS]?.credits || 0;

  await db.user.update({
    where: { id: dbSubscription.userId },
    data: {
      credits: {
        set: credits, // Reset to full amount
      },
    },
  });

  await db.creditTransaction.create({
    data: {
      userId: dbSubscription.userId,
      amount: credits,
      type: 'subscription',
      description: `Monthly credit renewal - ${plan}`,
    },
  });
}

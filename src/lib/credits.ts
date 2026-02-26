/**
 * Single source of truth for credit amounts (register, Stripe, UI copy).
 * Must match Prisma User.credits default (10) for new users.
 */
export const DEFAULT_CREDITS = 10;

/** Credits added per Stripe "Buy credits" purchase (used in checkout + webhook metadata). */
export const STRIPE_CREDITS_AMOUNT = 10;

export function getStripeCreditsAmount(): number {
  return STRIPE_CREDITS_AMOUNT;
}

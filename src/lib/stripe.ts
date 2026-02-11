/**
 * Stripe configuration — same structure as complete package.
 * Subscription plans and credit amounts.
 */
export const PLANS = [
  { name: "Free", credits: 10, priceId: null, amount: 0 },
  { name: "Pro", credits: 100, priceId: process.env.STRIPE_PRO_PRICE_ID ?? "", amount: 20 },
  { name: "Business", credits: 300, priceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? "", amount: 50 },
] as const;

export function getCreditsForPlan(planName: string): number {
  const plan = PLANS.find((p) => p.name === planName);
  return plan?.credits ?? 0;
}

/**
 * Single source of truth for what each paid plan means in this app. The
 * Stripe webhook reads this to decide what to write to `users.plan` /
 * `users.monthlyRunQuota` — it never trusts a plan name from the client, only
 * the Stripe price ID that was actually paid for.
 *
 * Set the corresponding env vars to the real Price IDs from your Stripe
 * dashboard (Product catalog -> each Product -> copy its Price ID, starts
 * with `price_`). See README "Payments (Stripe)" for the full setup.
 */
export type PlanId = "free" | "pro" | "premium";

export const FREE_PLAN_QUOTA = 10;

export const PAID_PLANS: {
  id: Exclude<PlanId, "free">;
  name: string;
  monthlyRunQuota: number;
  priceIdEnvVar: "STRIPE_PRICE_PRO" | "STRIPE_PRICE_PREMIUM";
}[] = [
  {
    id: "pro",
    name: "Pro",
    monthlyRunQuota: 60,
    priceIdEnvVar: "STRIPE_PRICE_PRO",
  },
  {
    id: "premium",
    name: "Premium",
    monthlyRunQuota: 200,
    priceIdEnvVar: "STRIPE_PRICE_PREMIUM",
  },
];

export function getPlanByPriceId(priceId: string) {
  return PAID_PLANS.find((p) => process.env[p.priceIdEnvVar] === priceId) ?? null;
}

export function getPriceIdForPlan(planId: Exclude<PlanId, "free">): string {
  const plan = PAID_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const priceId = process.env[plan.priceIdEnvVar];
  if (!priceId) {
    throw new Error(
      `${plan.priceIdEnvVar} is not set — add it to your environment variables.`
    );
  }
  return priceId;
}

import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  // Pinned explicitly rather than relying on the SDK's built-in default, so an
  // SDK upgrade never silently changes which API version you're calling.
  client = new Stripe(secretKey, { apiVersion: "2026-08-26.dahlia" });
  return client;
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getPriceIdForPlan, PlanId } from "@/lib/plans";

const bodySchema = z.object({
  plan: z.enum(["pro", "premium"]),
});

function getAppUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const stripe = getStripe();
  const appUrl = getAppUrl(req);

  // Reuse an existing Stripe customer if this user already has one (e.g. from
  // a prior canceled subscription) rather than creating a duplicate.
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId },
    });
  }

  let priceId: string;
  try {
    priceId = getPriceIdForPlan(parsed.data.plan as Exclude<PlanId, "free">);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "That plan isn't configured yet. Check STRIPE_PRICE_* env vars." },
      { status: 500 }
    );
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?billing=success`,
    cancel_url: `${appUrl}/dashboard?billing=canceled`,
    // Belt-and-suspenders: the webhook can identify the user via the Stripe
    // customer ID alone, but stamping userId in metadata too means a webhook
    // handler bug in customer lookup doesn't silently misattribute a plan.
    client_reference_id: user.id,
    subscription_data: { metadata: { userId: user.id } },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Stripe didn't return a checkout URL." },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: checkoutSession.url });
}

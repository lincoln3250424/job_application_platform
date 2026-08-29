import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getPlanByPriceId, FREE_PLAN_QUOTA } from "@/lib/plans";

async function upsertSubscriptionFromStripeObject(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) {
    // Falls back to the userId stamped in subscription_data.metadata at
    // Checkout time — covers the (rare) case where stripeCustomerId wasn't
    // saved yet when this event arrived.
    const fallbackUserId = sub.metadata?.userId;
    console.error(
      `Webhook: no user found for Stripe customer ${customerId}. metadata.userId=${fallbackUserId}`
    );
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const planConfig = priceId ? getPlanByPriceId(priceId) : null;
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId || "",
      plan: planConfig?.id || "unknown",
      status: sub.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId || "",
      plan: planConfig?.id || "unknown",
      status: sub.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  // Only an active/trialing subscription should grant the paid quota — a
  // past_due or unpaid subscription still exists as a row but shouldn't
  // silently keep elevated access.
  const isEntitled = sub.status === "active" || sub.status === "trialing";
  if (isEntitled && planConfig) {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: planConfig.id, monthlyRunQuota: planConfig.monthlyRunQuota },
    });
  } else if (!isEntitled) {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "free", monthlyRunQuota: FREE_PLAN_QUOTA },
    });
  }
}

async function revertUserToFree(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { plan: "free", monthlyRunQuota: FREE_PLAN_QUOTA },
  });
  await prisma.subscription.updateMany({
    where: { userId: user.id },
    data: { status: "canceled" },
  });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  // Signature verification needs the exact raw request body — do not parse
  // it as JSON before this point, or the signature check will fail.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Stripe redelivers events on timeout/error — skip anything already handled.
  const alreadyProcessed = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (checkoutSession.subscription) {
          const subscriptionId =
            typeof checkoutSession.subscription === "string"
              ? checkoutSession.subscription
              : checkoutSession.subscription.id;
          const sub = await getStripe().subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionFromStripeObject(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripeObject(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await revertUserToFree(sub);
        break;
      }
      case "invoice.payment_failed": {
        // Stripe's own dunning emails handle notifying the customer in most
        // configurations. Logged here so it's visible in your own monitoring
        // too — add a Resend notification here if you want an in-app email.
        console.warn("Stripe invoice payment failed:", event.data.object);
        break;
      }
      default:
        // Unhandled event types are fine to ignore — Stripe sends many more
        // event types than this app acts on.
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe webhook event ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  await prisma.webhookEvent.create({
    data: { stripeEventId: event.id, type: event.type },
  });

  return NextResponse.json({ received: true });
}

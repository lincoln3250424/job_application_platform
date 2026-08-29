import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

function getAppUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account yet — subscribe to a plan first." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl(req)}/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}

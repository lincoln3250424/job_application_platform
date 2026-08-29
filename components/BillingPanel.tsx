"use client";

import { useState } from "react";

type Props = {
  plan: string;
  monthlyRunQuota: number;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null; // ISO string
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

export function BillingPanel({
  plan,
  monthlyRunQuota,
  subscriptionStatus,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function goToCheckout(targetPlan: "pro" | "premium") {
    setError(null);
    setBusy(targetPlan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Couldn't start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setError(null);
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Couldn't open the billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-paper-hi border border-rule rounded-lg p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            Current plan
          </div>
          <div className="font-display font-bold text-xl">
            {PLAN_LABELS[plan] || plan}
            <span className="font-mono text-xs font-normal text-ink-soft ml-2">
              {monthlyRunQuota} runs/month
            </span>
          </div>
          {subscriptionStatus && subscriptionStatus !== "active" && (
            <div className="font-mono text-[11px] text-amber mt-1">
              Subscription status: {subscriptionStatus}
            </div>
          )}
          {cancelAtPeriodEnd && currentPeriodEnd && (
            <div className="font-mono text-[11px] text-ink-soft mt-1">
              Cancels on {new Date(currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {plan === "free" && (
            <>
              <button
                onClick={() => goToCheckout("pro")}
                disabled={!!busy}
                className="font-mono text-xs uppercase tracking-wide bg-ink text-paper-hi px-4 py-2.5 rounded-md hover:bg-[#3a332a] disabled:opacity-50"
              >
                {busy === "pro" ? "Redirecting…" : "Upgrade to Pro"}
              </button>
              <button
                onClick={() => goToCheckout("premium")}
                disabled={!!busy}
                className="font-mono text-xs uppercase tracking-wide border border-ink px-4 py-2.5 rounded-md hover:bg-ink hover:text-paper-hi transition-colors disabled:opacity-50"
              >
                {busy === "premium" ? "Redirecting…" : "Upgrade to Premium"}
              </button>
            </>
          )}
          {plan !== "free" && (
            <button
              onClick={openPortal}
              disabled={!!busy}
              className="font-mono text-xs uppercase tracking-wide border border-ink px-4 py-2.5 rounded-md hover:bg-ink hover:text-paper-hi transition-colors disabled:opacity-50"
            >
              {busy === "portal" ? "Opening…" : "Manage billing"}
            </button>
          )}
        </div>
      </div>
      {error && <div className="text-red text-sm font-mono mt-3">{error}</div>}
    </div>
  );
}

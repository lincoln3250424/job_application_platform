"use client";

import { useState } from "react";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

export function SidebarPlan({
  plan,
  monthlyRunQuota,
  used,
  quota,
}: {
  plan: string;
  monthlyRunQuota: number;
  used: number;
  quota: number;
}) {
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

  const remaining = Math.max(quota - used, 0);
  const pct = quota > 0 ? (used / quota) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-soft border-b border-rule pb-2 mb-2">
          Current Plan
        </div>
        <div className="font-display font-bold text-lg">
          {PLAN_LABELS[plan] || plan}
          <span className="font-mono text-xs font-normal text-ink-soft ml-1.5">
            {monthlyRunQuota} runs/month
          </span>
        </div>
        <div className="text-xs text-ink-soft mt-2">
          {used} / {quota} used · {remaining} remaining this month
        </div>
        <div className="h-1 bg-rule mt-2">
          <div
            className="h-1 bg-ink"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-soft border-b border-rule pb-2 mb-2">
          Upgrade Plan
        </div>
        {plan === "free" ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => goToCheckout("pro")}
              disabled={!!busy}
              className="w-full font-mono text-xs uppercase tracking-wide bg-ink text-paper-hi px-3 py-2 hover:bg-[#3a332a] disabled:opacity-50"
            >
              {busy === "pro" ? "Redirecting…" : "Upgrade to Pro"}
            </button>
            <button
              type="button"
              onClick={() => goToCheckout("premium")}
              disabled={!!busy}
              className="w-full font-mono text-xs uppercase tracking-wide border border-ink px-3 py-2 hover:bg-ink hover:text-paper-hi transition-colors disabled:opacity-50"
            >
              {busy === "premium" ? "Redirecting…" : "Upgrade to Premium"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPortal}
            disabled={!!busy}
            className="w-full font-mono text-xs uppercase tracking-wide border border-ink px-3 py-2 hover:bg-ink hover:text-paper-hi transition-colors disabled:opacity-50"
          >
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </button>
        )}
        {error && <div className="text-red text-xs font-mono mt-2">{error}</div>}
      </div>
    </div>
  );
}

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/lib/quota";

type Stat = {
  label: string;
  value: string;
  helper: string;
  bar?: number;
};

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="bg-paper-hi border border-rule p-[18px_20px]">
      <div className="text-[11px] text-ink-soft tracking-wide mb-2.5">
        {stat.label}
      </div>
      <div className="font-display font-bold text-[30px] leading-none">
        {stat.value}
      </div>
      <div className="text-xs text-ink-soft mt-2">{stat.helper}</div>
      {stat.bar !== undefined && (
        <div className="h-1 bg-rule mt-3">
          <div
            className="h-1 bg-ink"
            style={{ width: `${Math.min(stat.bar * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default async function UnitEconomicsPage() {
  const session = await getSession();
  if (!session) return null; // proxy.ts guards this route

  const [user, quota, totalCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { plan: true, monthlyRunQuota: true },
    }),
    checkQuota(session.userId),
    prisma.application.count({ where: { userId: session.userId } }),
  ]);

  const remaining = Math.max(quota.quota - quota.used, 0);
  const estCost = (totalCount * 0.05).toFixed(2);
  const stats: Stat[] = [
    {
      label: "Monthly Runs Used",
      value: `${quota.used} / ${quota.quota}`,
      helper: `${remaining} remaining this month`,
      bar: quota.quota > 0 ? quota.used / quota.quota : 0,
    },
    {
      label: "Plan",
      value: user.plan === "free" ? "Free" : user.plan,
      helper: `${user.monthlyRunQuota} monthly runs`,
    },
    {
      label: "Total Applications",
      value: String(totalCount),
      helper: "all time",
    },
    {
      label: "Est. Pipeline Cost",
      value: `$${estCost}`,
      helper: "rough estimate at ~$0.05 per run",
    },
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display font-bold text-[32px] leading-none">
          Unit Economics
        </h1>
        <p className="text-ink-soft text-sm mt-1.5">
          Usage and rough cost tracking for the 4-agent pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>
    </div>
  );
}

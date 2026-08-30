import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/lib/quota";
import { ApplicationsTable } from "@/components/ApplicationsTable";

type Stat = {
  label: string;
  value: string;
  sub?: string;
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
        {stat.sub && (
          <span className="text-[16px] text-ink-soft font-mono font-normal">
            {stat.sub}
          </span>
        )}
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

export default async function ApplicationsHistoryPage() {
  const session = await getSession();
  if (!session) return null; // proxy.ts guards this route

  const [user, applications, quota, totalCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { plan: true, monthlyRunQuota: true },
    }),
    prisma.application.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        resumeDrafts: {
          orderBy: { draftNumber: "desc" },
          take: 1,
          include: { review: true },
        },
      },
    }),
    checkQuota(session.userId),
    prisma.application.count({ where: { userId: session.userId } }),
  ]);

  const remaining = Math.max(quota.quota - quota.used, 0);
  const stats: Stat[] = [
    {
      label: "Monthly Runs",
      value: String(quota.used),
      sub: `/${quota.quota}`,
      helper: `${remaining} runs remaining this month`,
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
      helper: "shown: latest 30",
    },
    {
      label: "Pipeline Runs",
      value: String(totalCount),
      helper: "est. cost ~$0.15",
    },
  ];

  const rows = applications.map((app) => {
    const latest = app.resumeDrafts[0];
    return {
      id: app.id,
      jobTitle: app.jobTitle,
      companyName: app.companyName,
      source: app.fetchMethod,
      verdict: latest?.review?.verdict ?? null,
      matchScore: latest?.matchScore ?? null,
      createdAt: new Date(app.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  });

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-7">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-none">
            Applications History
          </h1>
          <p className="text-ink-soft text-sm mt-1.5">
            Every run of the 4-agent pipeline, with verdicts and match scores.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="font-mono text-[13px] uppercase tracking-wide bg-ink text-paper-hi px-[18px] py-2.5 hover:bg-[#3a332a] transition-colors"
        >
          + New Application
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      <ApplicationsTable applications={rows} />
    </div>
  );
}

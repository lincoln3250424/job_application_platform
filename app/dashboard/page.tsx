import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/lib/quota";
import { NewApplicationForm } from "@/components/NewApplicationForm";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const session = await getSession();
  if (!session) return null; // proxy.ts guards this route

  const { billing } = await searchParams;

  const [resumes, quota] = await Promise.all([
    prisma.baseResume.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, isDefault: true },
    }),
    checkQuota(session.userId),
  ]);

  return (
    <div className="space-y-10">
      {billing === "success" && (
        <div className="bg-green/10 border border-green text-green px-5 py-3 font-mono text-sm">
          Subscription active — thanks! It can take a few seconds for your new
          quota to show up here.
        </div>
      )}
      {billing === "canceled" && (
        <div className="bg-tab border border-rule text-ink-soft px-5 py-3 font-mono text-sm">
          Checkout canceled — no changes made.
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display font-bold text-2xl">New Application</h1>
          <span className="font-mono text-[11px] text-ink-soft">
            {quota.used}/{quota.quota} runs this month
          </span>
        </div>
        <div className="bg-paper-hi border border-rule p-6 mt-4">
          <NewApplicationForm resumes={resumes} />
        </div>
      </div>
    </div>
  );
}

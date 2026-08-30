import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/lib/quota";
import { NewApplicationForm } from "@/components/NewApplicationForm";

const VERDICT_STYLES: Record<string, string> = {
  strong: "text-green border-green",
  stretch: "text-amber border-amber",
  mismatch: "text-red border-red",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const session = await getSession();
  if (!session) return null; // proxy.ts guards this route

  const { billing } = await searchParams;

  const [applications, resumes, quota] = await Promise.all([
    prisma.application.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        resumeDrafts: {
          orderBy: { draftNumber: "desc" },
          take: 1,
          include: { review: true },
        },
      },
    }),
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
        <div className="bg-green/10 border border-green text-green rounded-lg px-5 py-3 font-mono text-sm">
          Subscription active — thanks! It can take a few seconds for your new quota to
          show up here.
        </div>
      )}
      {billing === "canceled" && (
        <div className="bg-tab border border-rule text-ink-soft rounded-lg px-5 py-3 font-mono text-sm">
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
        <div className="bg-paper-hi border border-rule rounded-lg p-6 mt-4">
          <NewApplicationForm resumes={resumes} />
        </div>
      </div>

      <div>
        <h2 className="font-display font-bold text-xl mb-4">Your applications</h2>
        {applications.length === 0 ? (
          <p className="text-ink-soft text-sm italic">
            Nothing yet — run your first application above.
          </p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const latest = app.resumeDrafts[0];
              const verdict = latest?.review?.verdict;
              return (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="block bg-paper-hi border border-rule rounded-lg px-5 py-4 hover:border-ink transition-colors"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-display font-semibold">
                        {app.jobTitle || "Untitled role"}
                        {app.companyName ? ` · ${app.companyName}` : ""}
                      </div>
                      <div className="font-mono text-[11px] text-ink-soft mt-0.5">
                        {new Date(app.createdAt).toLocaleDateString()} · draft{" "}
                        {latest?.draftNumber ?? "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {latest?.matchScore != null && (
                        <span className="font-mono text-xs bg-tab rounded px-2 py-1">
                          {latest.matchScore}/100
                        </span>
                      )}
                      {verdict && (
                        <span
                          className={`font-mono text-[10px] uppercase tracking-wide border rounded-full px-2.5 py-1 ${VERDICT_STYLES[verdict]}`}
                        >
                          {verdict}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

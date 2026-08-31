import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApplicationsTable } from "@/components/ApplicationsTable";

export default async function ApplicationsHistoryPage() {
  const session = await getSession();
  if (!session) return null; // proxy.ts guards this route

  const applications = await prisma.application.findMany({
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
  });

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

      <ApplicationsTable applications={rows} />
    </div>
  );
}

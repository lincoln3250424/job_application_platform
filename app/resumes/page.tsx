import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ResumeManager } from "@/components/ResumeManager";

export default async function ResumesPage() {
  const session = await getSession();
  if (!session) return null; // proxy.ts guards this route

  const resumes = await prisma.baseResume.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  const rows = resumes.map((r) => ({
    id: r.id,
    label: r.label,
    content: r.content,
    isDefault: r.isDefault,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-7">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-none">
            Base Resumes
          </h1>
          <p className="text-ink-soft text-sm mt-1.5">
            Saved source resumes you reuse across applications.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="font-mono text-[13px] uppercase tracking-wide bg-ink text-paper-hi px-[18px] py-2.5 hover:bg-[#3a332a] transition-colors"
        >
          + New Application
        </Link>
      </div>

      <ResumeManager resumes={rows} />
    </div>
  );
}

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SidebarResumes } from "./SidebarResumes";
import { SidebarActiveLink } from "./SidebarActiveLink";

const VERDICT_DOT: Record<string, string> = {
  strong: "bg-green",
  stretch: "bg-amber",
  mismatch: "bg-red",
};

export async function AppSidebar() {
  const session = await getSession();
  if (!session) return null; // proxy.ts guards the routes that render this

  const [applications, resumes] = await Promise.all([
    prisma.application.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        createdAt: true,
        resumeDrafts: {
          orderBy: { draftNumber: "desc" },
          take: 1,
          select: { review: { select: { verdict: true } } },
        },
      },
    }),
    prisma.baseResume.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, label: true, isDefault: true },
    }),
  ]);

  return (
    <nav className="space-y-7">
      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-soft border-b border-rule pb-2 mb-2">
          Workspace
        </div>
        <SidebarActiveLink
          href="/dashboard"
          className="block text-sm font-display font-semibold px-2 py-1.5 rounded"
        >
          New application
        </SidebarActiveLink>
      </div>

      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-soft border-b border-rule pb-2 mb-2">
          Application history
        </div>
        {applications.length === 0 ? (
          <p className="text-xs text-ink-soft italic px-2">Nothing yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {applications.map((app) => {
              const verdict = app.resumeDrafts[0]?.review?.verdict;
              return (
                <li key={app.id}>
                  <SidebarActiveLink
                    href={`/applications/${app.id}`}
                    className="block px-2 py-1.5 rounded"
                  >
                    <span className="block text-xs font-display font-semibold truncate">
                      {app.jobTitle || "Untitled role"}
                      {app.companyName ? ` · ${app.companyName}` : ""}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-soft mt-0.5">
                      {new Date(app.createdAt).toLocaleDateString()}
                      {verdict && (
                        <span className="flex items-center gap-1">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                              VERDICT_DOT[verdict] ?? "bg-ink-soft"
                            }`}
                          />
                          {verdict}
                        </span>
                      )}
                    </span>
                  </SidebarActiveLink>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-soft border-b border-rule pb-2 mb-2">
          Resumes
        </div>
        <SidebarResumes resumes={resumes} />
      </div>
    </nav>
  );
}

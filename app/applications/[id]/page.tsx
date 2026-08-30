import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MarkdownBlock } from "@/components/MarkdownBlock";
import { ApplicationActions } from "@/components/ApplicationActions";
import { VerdictStamp } from "@/components/VerdictStamp";
import { ResumeImprovementForm } from "@/components/ResumeImprovementForm";

const TABS = [
  { key: "analyst", label: "The Analyst" },
  { key: "editor", label: "The Editor" },
  { key: "reviewer", label: "The Reviewer" },
  { key: "coach", label: "The Interview Coach" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-paper-hi border border-rule rounded-lg p-8 text-center">
      <h2 className="font-display font-bold text-lg mb-1">{title}</h2>
      <p className="text-sm text-ink-soft">{body}</p>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab)
    ? (tab as TabKey)
    : "analyst";

  const session = await getSession();
  if (!session) return null; // middleware guards this route

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      requirementAnalysis: true,
      resumeDrafts: {
        orderBy: { draftNumber: "asc" },
        include: { review: true },
      },
      interviewPreps: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!application || application.userId !== session.userId) {
    notFound();
  }

  const latestDraft = application.resumeDrafts[application.resumeDrafts.length - 1];
  const latestInterviewPrep = application.interviewPreps[0];
  const needsRetry =
    !application.requirementAnalysis ||
    application.resumeDrafts.length === 0 ||
    !latestDraft?.review;
  const canRevise = !!latestDraft?.review;
  const canEmail = application.resumeDrafts.length > 0;
  const canPrepInterview = application.resumeDrafts.length > 0;

  const drafts = application.resumeDrafts;
  const reviews = drafts
    .map((draft) => ({ draft, review: draft.review }))
    .filter((x): x is { draft: (typeof drafts)[number]; review: NonNullable<(typeof drafts)[number]["review"]> } => !!x.review);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] tracking-widest uppercase text-ink-soft mb-1">
          Case file · {new Date(application.createdAt).toLocaleDateString()}
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">
          {application.jobTitle || "Untitled role"}
          {application.companyName ? (
            <span className="text-ink-soft font-medium"> · {application.companyName}</span>
          ) : null}
        </h1>
      </div>

      <details className="bg-paper-hi border border-rule rounded-lg">
        <summary className="cursor-pointer px-5 py-4 font-mono text-xs uppercase tracking-wide text-ink-soft">
          Original job post
        </summary>
        <div className="px-5 pb-5 text-sm whitespace-pre-wrap text-ink-soft border-t border-rule pt-4">
          {application.jobPostText}
        </div>
      </details>

      <nav className="flex gap-1.5 bg-tab border border-rule rounded-xl p-1.5 overflow-x-auto">
        {TABS.map((t, i) => {
          const active = activeTab === t.key;
          return (
            <Link
              key={t.key}
              href={`/applications/${id}?tab=${t.key}`}
              className={`flex-1 min-w-fit text-center font-mono text-xs uppercase tracking-wide px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
                active
                  ? "bg-ink text-paper-hi shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-paper"
              }`}
            >
              <span className={`mr-1.5 ${active ? "opacity-70" : "opacity-50"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {t.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "analyst" &&
        (application.requirementAnalysis ? (
          <section className="bg-paper-hi border border-rule rounded-lg p-6">
            <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
              Agent 01 · Requirement Extractor
            </div>
            <h2 className="font-display font-bold text-xl mb-4">The Analyst</h2>
            <MarkdownBlock content={application.requirementAnalysis.contentMd} />
          </section>
        ) : (
          <EmptyState
            title="No analysis yet"
            body="The Analyst hasn't broken down this job post yet. Run the pipeline below."
          />
        ))}

      {activeTab === "editor" &&
        (drafts.length > 0 ? (
          <div className="space-y-6">
            {drafts.map((draft) => (
              <section
                key={draft.id}
                className="bg-paper-hi border border-rule rounded-lg p-6"
              >
                <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                      Draft {draft.draftNumber}
                    </div>
                    <h2 className="font-display font-bold text-xl">The Editor</h2>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {draft.matchScore != null && (
                      <span className="font-mono text-xs bg-tab rounded px-2.5 py-1">
                        Match {draft.matchScore}/100
                      </span>
                    )}
                    {draft.hardGatePassRate && (
                      <span className="font-mono text-xs bg-tab rounded px-2.5 py-1">
                        Gates {draft.hardGatePassRate}
                      </span>
                    )}
                    {draft.interviewLikelihood && (
                      <span className="font-mono text-xs bg-tab rounded px-2.5 py-1">
                        Interview: {draft.interviewLikelihood}
                      </span>
                    )}
                  </div>
                </div>
                <MarkdownBlock content={draft.contentMd} />
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No resume draft yet"
            body="The Editor hasn't produced a tailored resume yet. Run the pipeline below."
          />
        ))}

      {activeTab === "reviewer" && (
        <div className="space-y-6">
          {reviews.length > 0 ? (
            reviews.map(({ draft, review }) => (
              <section
                key={review.id}
                className="bg-paper-hi border border-rule rounded-lg p-6"
              >
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
                  Draft {draft.draftNumber} · Red Team
                </div>
                <h2 className="font-display font-bold text-xl mb-1">The Reviewer</h2>
                <div className="font-mono text-[11px] text-ink-soft mb-4">
                  Skeptical Hiring Manager
                </div>
                <MarkdownBlock content={review.contentMd} />
                {review.verdict && <VerdictStamp verdict={review.verdict} />}
              </section>
            ))
          ) : (
            <EmptyState
              title="No review yet"
              body="The Reviewer hasn't critiqued a resume yet. Run the pipeline below."
            />
          )}
          {canRevise && <ResumeImprovementForm applicationId={id} />}
        </div>
      )}

      {activeTab === "coach" &&
        (latestInterviewPrep ? (
          <section className="bg-paper-hi border border-rule rounded-lg p-6">
            <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
              Optional
            </div>
            <h2 className="font-display font-bold text-xl mb-1">The Interview Coach</h2>
            <div className="font-mono text-[11px] text-ink-soft mb-4">
              Researches the company · drafts answers from your resume only
            </div>
            <MarkdownBlock content={latestInterviewPrep.contentMd} />
            {(!Array.isArray(latestInterviewPrep.sources) ||
              latestInterviewPrep.sources.length === 0) && (
              <div className="mt-5 pt-4 border-t border-rule font-mono text-[11px] text-ink-soft">
                Prepared from the model&rsquo;s knowledge - live Google Search
                isn&rsquo;t enabled on the current Gemini plan, so company
                details aren&rsquo;t research-verified.
              </div>
            )}
            {Array.isArray(latestInterviewPrep.sources) &&
              latestInterviewPrep.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t border-rule">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                    Sources
                  </div>
                  <ul className="space-y-1">
                    {(latestInterviewPrep.sources as { title: string; uri: string }[]).map(
                      (source, i) => (
                        <li key={i}>
                          <a
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue underline break-all"
                          >
                            {source.title}
                          </a>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </section>
        ) : (
          <EmptyState
            title="No interview prep yet"
            body="The Interview Coach hasn't prepared this case yet. Use the button below."
          />
        ))}

      <ApplicationActions
        applicationId={application.id}
        needsRetry={needsRetry}
        canRevise={canRevise}
        canEmail={canEmail}
        canExport={canEmail}
        canPrepInterview={canPrepInterview}
      />
    </div>
  );
}

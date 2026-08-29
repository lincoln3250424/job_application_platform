import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MarkdownBlock } from "@/components/MarkdownBlock";
import { ApplicationActions } from "@/components/ApplicationActions";
import { VerdictStamp } from "@/components/VerdictStamp";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <div className="space-y-8">
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

      {application.requirementAnalysis && (
        <section className="bg-paper-hi border border-rule rounded-lg p-6">
          <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
            01 / 03
          </div>
          <h2 className="font-display font-bold text-xl mb-1">The Analyst</h2>
          <div className="font-mono text-[11px] text-ink-soft mb-4">
            Senior Technical Recruiter · Requirement Extractor
          </div>
          <MarkdownBlock content={application.requirementAnalysis.contentMd} />
        </section>
      )}

      {application.resumeDrafts.map((draft: (typeof application.resumeDrafts)[number]) => (
        <div key={draft.id} className="space-y-6">
          <section className="bg-paper-hi border border-rule rounded-lg p-6">
            <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  02 / 03 · Draft {draft.draftNumber}
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

          {draft.review && (
            <section className="bg-paper-hi border border-rule rounded-lg p-6">
              <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
                03 / 03 · Draft {draft.draftNumber}
              </div>
              <h2 className="font-display font-bold text-xl mb-1">The Reviewer</h2>
              <div className="font-mono text-[11px] text-ink-soft mb-4">
                Skeptical Hiring Manager · Red Team
              </div>
              <MarkdownBlock content={draft.review.contentMd} />
              {draft.review.verdict && <VerdictStamp verdict={draft.review.verdict} />}
            </section>
          )}
        </div>
      ))}

      {latestInterviewPrep && (
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
              Prepared from the model's knowledge - live Google Search isn't
              enabled on the current Gemini plan, so company details aren't
              research-verified.
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
      )}

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

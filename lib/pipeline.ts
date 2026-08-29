import { prisma } from "./db";
import {
  runAnalyst,
  runEditor,
  runReviewer,
  extractMatchScore,
  extractHardGatePassRate,
  extractLikelihood,
  extractVerdict,
  extractSection,
} from "./agents";

/**
 * Runs whatever part of the pipeline hasn't completed yet for this
 * application: Analyst if no requirement analysis exists, then Editor ->
 * Reviewer for draft #1 if no draft exists yet. Safe to call again after a
 * partial failure (e.g. Analyst succeeded but Editor's call errored) without
 * re-running or duplicating the step that already succeeded.
 */
export async function runOrResumePipeline(applicationId: string) {
  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      baseResume: true,
      requirementAnalysis: true,
      resumeDrafts: { orderBy: { draftNumber: "desc" }, take: 1 },
    },
  });

  if (!application.baseResume) {
    throw new Error("Application has no resume attached.");
  }

  let requirementAnalysis = application.requirementAnalysis;
  if (!requirementAnalysis) {
    const analystResult = await runAnalyst(application.jobPostText);
    requirementAnalysis = await prisma.requirementAnalysis.create({
      data: {
        applicationId,
        contentMd: analystResult.text,
        modelUsed: analystResult.modelUsed,
      },
    });
  }

  if (application.resumeDrafts.length > 0) {
    // Draft #1 already exists — nothing left for the initial run to do.
    // Use the revise endpoint to add another draft.
    return { requirementAnalysis, draft: null };
  }

  const draft = await runEditorAndReviewer(
    applicationId,
    requirementAnalysis.contentMd,
    application.baseResume.content,
    1
  );

  return { requirementAnalysis, draft };
}

/**
 * Runs the Analyst once for a freshly-created application, then Editor -> Reviewer
 * for draft #1. Kept as a thin alias over runOrResumePipeline for readability at
 * call sites that always expect a fresh application.
 */
export async function runInitialPipeline(applicationId: string) {
  return runOrResumePipeline(applicationId);
}

/**
 * Runs one Editor -> Reviewer pass and persists both as a new draft/review pair.
 * Used for both draft #1 and any subsequent revision loop.
 */
export async function runEditorAndReviewer(
  applicationId: string,
  requirementAnalysisMd: string,
  rawResumeText: string,
  draftNumber: number,
  revisionNotes?: string
) {
  const editorResult = await runEditor(
    requirementAnalysisMd,
    rawResumeText,
    revisionNotes
  );

  const resumeDraft = await prisma.resumeDraft.create({
    data: {
      applicationId,
      draftNumber,
      contentMd: editorResult.text,
      matchScore: extractMatchScore(editorResult.text) ?? undefined,
      hardGatePassRate: extractHardGatePassRate(editorResult.text) ?? undefined,
      interviewLikelihood:
        extractLikelihood(editorResult.text, "Interview Likelihood") ?? undefined,
      offerLikelihood:
        extractLikelihood(
          editorResult.text,
          "Offer Likelihood if Interviewed"
        ) ?? undefined,
      modelUsed: editorResult.modelUsed,
    },
  });

  const reviewerResult = await runReviewer(
    requirementAnalysisMd,
    editorResult.text,
    rawResumeText
  );

  const review = await prisma.review.create({
    data: {
      resumeDraftId: resumeDraft.id,
      contentMd: reviewerResult.text,
      verdict: extractVerdict(reviewerResult.text) ?? undefined,
      modelUsed: reviewerResult.modelUsed,
    },
  });

  return { resumeDraft, review };
}

/** Pulls the punch list out of the latest review to feed the next Editor pass. */
export function getRevisionNotes(reviewMarkdown: string): string {
  return (
    extractSection(reviewMarkdown, "Prioritized Revision Punch List") ??
    reviewMarkdown
  );
}

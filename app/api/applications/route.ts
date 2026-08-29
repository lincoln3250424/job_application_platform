import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkQuota } from "@/lib/quota";
import { runInitialPipeline } from "@/lib/pipeline";
import { fetchJobPostFromUrl, FetchJobPostError } from "@/lib/fetcher";

// Vercel route-segment config: the pipeline makes 3 sequential Gemini calls,
// which can take longer than the platform's 10s default on some plans.
// Raise this if you're on a plan that allows it; move to a background queue
// (Inngest) per the system design doc once run volume makes that worthwhile.
export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      resumeDrafts: {
        orderBy: { draftNumber: "desc" },
        take: 1,
        include: { review: true },
      },
    },
  });

  return NextResponse.json(applications);
}

const createSchema = z
  .object({
    jobPostText: z.string().min(40, "Job post text looks too short.").optional(),
    jobPostUrl: z.string().url("That doesn't look like a valid URL.").optional(),
    jobTitle: z.string().max(200).optional(),
    companyName: z.string().max(200).optional(),
    baseResumeId: z.string().uuid().optional(),
    resumeText: z.string().min(40).optional(),
  })
  .refine((data) => !!data.jobPostText !== !!data.jobPostUrl, {
    message: "Provide either jobPostText or jobPostUrl, not both.",
  });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }
  const { jobPostText, jobPostUrl, jobTitle, companyName, baseResumeId, resumeText } =
    parsed.data;

  if (!baseResumeId && !resumeText) {
    return NextResponse.json(
      { error: "Provide either a saved resume (baseResumeId) or resumeText." },
      { status: 400 }
    );
  }

  const quota = await checkQuota(session.userId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Monthly run quota reached (${quota.used}/${quota.quota}). Try again next month.`,
      },
      { status: 429 }
    );
  }

  // If a URL was given instead of pasted text, run the Fetcher (Agent 0)
  // before creating anything — a failed scrape shouldn't leave a half-empty
  // application behind. The user just retries with pasted text instead.
  let resolvedJobPostText: string;
  let fetchMethod: "paste" | "url_scrape" = "paste";
  if (jobPostUrl) {
    try {
      resolvedJobPostText = await fetchJobPostFromUrl(jobPostUrl);
      fetchMethod = "url_scrape";
    } catch (err) {
      const message =
        err instanceof FetchJobPostError
          ? err.message
          : "Couldn't fetch that job post. Try pasting the text instead.";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  } else {
    resolvedJobPostText = jobPostText!;
  }

  // Resolve which base resume to attach: an existing saved one, or save the
  // pasted text as a new one so future applications can reuse it too.
  let resumeId = baseResumeId;
  if (!resumeId && resumeText) {
    const created = await prisma.baseResume.create({
      data: {
        userId: session.userId,
        label: "Untitled resume",
        content: resumeText,
      },
    });
    resumeId = created.id;
  } else if (resumeId) {
    const existing = await prisma.baseResume.findUnique({ where: { id: resumeId } });
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }
  }

  const application = await prisma.application.create({
    data: {
      userId: session.userId,
      baseResumeId: resumeId,
      jobTitle,
      companyName,
      jobPostText: resolvedJobPostText,
      jobPostSourceUrl: jobPostUrl,
      fetchMethod,
    },
  });

  try {
    await runInitialPipeline(application.id);
  } catch (err) {
    console.error("Pipeline run failed:", err);
    return NextResponse.json(
      {
        error:
          "The application was saved, but the review pipeline failed to complete. You can retry from the application page.",
        applicationId: application.id,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ id: application.id }, { status: 201 });
}

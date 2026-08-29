import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { runInterviewPrep } from "@/lib/agents";

// Search-grounded generation can take longer than a plain text call — the
// model may issue several searches before responding.
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      resumeDrafts: { orderBy: { draftNumber: "desc" }, take: 1 },
    },
  });

  if (!application || application.userId !== session.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const latestDraft = application.resumeDrafts[0];
  if (!latestDraft) {
    return NextResponse.json(
      { error: "Run the review pipeline before generating interview prep." },
      { status: 400 }
    );
  }

  try {
    const result = await runInterviewPrep({
      jobPostText: application.jobPostText,
      jobTitle: application.jobTitle,
      companyName: application.companyName,
      resumeMarkdown: latestDraft.contentMd,
    });

    const interviewPrep = await prisma.interviewPrep.create({
      data: {
        applicationId: id,
        resumeDraftId: latestDraft.id,
        contentMd: result.text,
        sources: result.sources,
        modelUsed: result.modelUsed,
      },
    });

    return NextResponse.json(interviewPrep, { status: 201 });
  } catch (err) {
    console.error("Interview prep generation failed:", err);
    return NextResponse.json(
      { error: "Couldn't generate interview prep. Try again." },
      { status: 502 }
    );
  }
}

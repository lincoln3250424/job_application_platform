import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { runEditorAndReviewer, getRevisionNotes } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const additionalInfo =
    typeof body?.additionalInfo === "string" && body.additionalInfo.trim()
      ? body.additionalInfo.trim()
      : undefined;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      baseResume: true,
      requirementAnalysis: true,
      resumeDrafts: {
        orderBy: { draftNumber: "desc" },
        take: 1,
        include: { review: true },
      },
    },
  });

  if (!application || application.userId !== session.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!application.baseResume || !application.requirementAnalysis) {
    return NextResponse.json(
      { error: "Run the initial pipeline before requesting a revision." },
      { status: 400 }
    );
  }
  const latestDraft = application.resumeDrafts[0];
  if (!latestDraft || !latestDraft.review) {
    return NextResponse.json(
      { error: "No completed review to revise from yet." },
      { status: 400 }
    );
  }

  const revisionNotes = getRevisionNotes(latestDraft.review.contentMd);

  try {
    const { resumeDraft, review } = await runEditorAndReviewer(
      id,
      application.requirementAnalysis.contentMd,
      application.baseResume.content,
      latestDraft.draftNumber + 1,
      revisionNotes,
      additionalInfo
    );
    return NextResponse.json({ resumeDraft, review }, { status: 201 });
  } catch (err) {
    console.error("Revision pass failed:", err);
    return NextResponse.json(
      { error: "The revision pass failed. Try again." },
      { status: 502 }
    );
  }
}

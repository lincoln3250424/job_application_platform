import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendResumeEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

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
    return NextResponse.json({ error: "No resume draft to email yet." }, { status: 400 });
  }

  try {
    await sendResumeEmail({
      userId: session.userId,
      applicationId: id,
      to: user.email,
      jobTitle: application.jobTitle,
      companyName: application.companyName,
      jobPostText: application.jobPostText,
      resumeMarkdown: latestDraft.contentMd,
    });
  } catch (err) {
    console.error("Email send failed:", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      baseResume: true,
      requirementAnalysis: true,
      resumeDrafts: {
        orderBy: { draftNumber: "asc" },
        include: { review: true },
      },
    },
  });

  if (!application || application.userId !== session.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(application);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const application = await prisma.application.findUnique({ where: { id } });
  if (!application || application.userId !== session.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

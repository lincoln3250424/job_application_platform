import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { runOrResumePipeline } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(
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

  try {
    await runOrResumePipeline(id);
  } catch (err) {
    console.error("Pipeline retry failed:", err);
    return NextResponse.json(
      { error: "The pipeline failed again. Check server logs for details." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

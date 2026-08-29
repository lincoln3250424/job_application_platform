import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resumes = await prisma.baseResume.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(resumes);
}

const createSchema = z.object({
  label: z.string().min(1).max(100).default("My resume"),
  content: z.string().min(40, "Resume text looks too short."),
  isDefault: z.boolean().optional(),
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

  if (parsed.data.isDefault) {
    await prisma.baseResume.updateMany({
      where: { userId: session.userId },
      data: { isDefault: false },
    });
  }

  const resume = await prisma.baseResume.create({
    data: { ...parsed.data, userId: session.userId },
  });

  return NextResponse.json(resume, { status: 201 });
}

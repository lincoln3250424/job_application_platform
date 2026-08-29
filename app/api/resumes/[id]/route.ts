import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const patchSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  content: z.string().min(40).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.baseResume.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  if (parsed.data.isDefault) {
    await prisma.baseResume.updateMany({
      where: { userId: session.userId },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.baseResume.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.baseResume.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.baseResume.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

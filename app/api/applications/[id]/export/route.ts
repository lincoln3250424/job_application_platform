import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { structureResume, StructuredResume } from "@/lib/resumeStructure";
import { buildResumeDocx } from "@/lib/documents/docx";
import { buildResumePdf } from "@/lib/documents/pdf";

export const maxDuration = 30;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const format = req.nextUrl.searchParams.get("format");
  if (format !== "pdf" && format !== "docx") {
    return NextResponse.json(
      { error: "Query param 'format' must be 'pdf' or 'docx'." },
      { status: 400 }
    );
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      resumeDrafts: { orderBy: { draftNumber: "desc" }, take: 1 },
    },
  });

  if (!application || application.userId !== session.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const draft = application.resumeDrafts[0];
  if (!draft) {
    return NextResponse.json({ error: "No resume draft to export yet." }, { status: 400 });
  }

  let structured = draft.structuredJson as StructuredResume | null;
  if (!structured) {
    try {
      structured = await structureResume(draft.contentMd);
      await prisma.resumeDraft.update({
        where: { id: draft.id },
        data: { structuredJson: structured },
      });
    } catch (err) {
      console.error("Resume structuring failed:", err);
      return NextResponse.json(
        { error: "Couldn't prepare this resume for export. Try again." },
        { status: 502 }
      );
    }
  }

  const filenameBase = slugify(
    `${structured.name || "resume"}-${application.companyName || application.jobTitle || "application"}`
  );

  try {
    if (format === "docx") {
      const buffer = await buildResumeDocx(structured);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filenameBase}.docx"`,
        },
      });
    } else {
      const buffer = await buildResumePdf(structured);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
        },
      });
    }
  } catch (err) {
    console.error("Document generation failed:", err);
    return NextResponse.json({ error: "Failed to generate the file." }, { status: 502 });
  }
}

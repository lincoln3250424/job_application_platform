import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { StructuredResume } from "../resumeStructure";

const ACCENT = "24211C"; // matches the app's ink color, reads fine in print

function contactLine(resume: StructuredResume): string {
  const parts = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    ...(resume.contact.links || []),
  ].filter(Boolean);
  return parts.join("  ·  ");
}

export async function buildResumeDocx(resume: StructuredResume): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: resume.name, bold: true, size: 32, color: ACCENT }),
      ],
    })
  );

  const contact = contactLine(resume);
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: contact, size: 18, color: "6C6252" })],
      })
    );
  }

  if (resume.summary) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: resume.summary, size: 21 })],
      })
    );
  }

  function sectionHeading(text: string) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 100 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "B9AF95", space: 2 },
        },
        children: [new TextRun({ text, bold: true, size: 22, color: ACCENT })],
      })
    );
  }

  if (resume.experience.length > 0) {
    sectionHeading("Experience");
    for (const job of resume.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [
            new TextRun({ text: `${job.title} — ${job.company}`, bold: true, size: 21 }),
            ...(job.dates
              ? [new TextRun({ text: `   ${job.dates}`, italics: true, size: 19, color: "6C6252" })]
              : []),
          ],
        })
      );
      for (const bullet of job.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: bullet, size: 20 })],
          })
        );
      }
    }
  }

  if (resume.education.length > 0) {
    sectionHeading("Education");
    for (const edu of resume.education) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: edu.institution, bold: true, size: 21 }),
            ...(edu.detail ? [new TextRun({ text: ` — ${edu.detail}`, size: 20 })] : []),
            ...(edu.dates
              ? [new TextRun({ text: `   ${edu.dates}`, italics: true, size: 19, color: "6C6252" })]
              : []),
          ],
        })
      );
    }
  }

  if (resume.skills.length > 0) {
    sectionHeading("Skills");
    children.push(
      new Paragraph({
        children: [new TextRun({ text: resume.skills.join("  ·  "), size: 20 })],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

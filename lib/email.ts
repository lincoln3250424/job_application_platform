import { Resend } from "resend";
import { prisma } from "./db";

let client: Resend | null = null;

function getClient(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
  client = new Resend(apiKey);
  return client;
}

function markdownToBasicHtml(md: string): string {
  // Minimal, dependency-free markdown -> HTML for email bodies. The app's own
  // pages use react-markdown for full rendering; this keeps the email simple
  // and safe (no raw HTML injection from model output).
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      if (line.trim() === "") return "<br/>";
      return `<p>${line}</p>`;
    })
    .join("\n");
}

export async function sendResumeEmail(params: {
  userId: string;
  applicationId: string;
  to: string;
  jobTitle: string | null;
  companyName: string | null;
  jobPostText: string;
  resumeMarkdown: string;
}) {
  const resend = getClient();
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress) throw new Error("RESEND_FROM_EMAIL is not set.");

  const subject = `Your resume for ${params.jobTitle || "this role"}${
    params.companyName ? ` at ${params.companyName}` : ""
  }`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 640px; margin: 0 auto;">
      <h1 style="font-size: 20px;">${subject}</h1>
      <h2>Final Resume</h2>
      ${markdownToBasicHtml(params.resumeMarkdown)}
      <hr style="margin: 32px 0;" />
      <h2>Original Job Post</h2>
      <pre style="white-space: pre-wrap; font-family: inherit; font-size: 13px; color: #444;">${params.jobPostText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>
    </div>
  `;

  let status = "sent";
  try {
    await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject,
      html,
    });
  } catch (err) {
    status = "failed";
    throw err;
  } finally {
    await prisma.emailLog.create({
      data: {
        userId: params.userId,
        applicationId: params.applicationId,
        type: "resume_export",
        sentTo: params.to,
        status,
      },
    });
  }
}

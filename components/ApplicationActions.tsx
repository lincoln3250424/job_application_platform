"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  applicationId: string;
  needsRetry: boolean;
  canRevise: boolean;
  canEmail: boolean;
  canExport: boolean;
  canPrepInterview: boolean;
};

export function ApplicationActions({
  applicationId,
  needsRetry,
  canRevise,
  canEmail,
  canExport,
  canPrepInterview,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);

  async function call(path: string, busyLabel: string) {
    setError(null);
    setBusy(busyLabel);
    try {
      const res = await fetch(`/api/applications/${applicationId}${path}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return false;
      }
      return true;
    } catch {
      setError("Network error. Try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleRetry() {
    if (await call("/run", "retry")) {
      router.refresh();
    }
  }

  async function handleRevise() {
    if (await call("/revise", "revise")) {
      router.refresh();
    }
  }

  async function handleInterviewPrep() {
    if (await call("/interview-prep", "interview-prep")) {
      router.refresh();
    }
  }

  async function handleEmail() {
    if (await call("/email", "email")) {
      setEmailed(true);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this application and all its drafts? This can't be undone.")) {
      return;
    }
    setError(null);
    setBusy("delete");
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Failed to delete.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {needsRetry && (
          <button
            onClick={handleRetry}
            disabled={!!busy}
            className="font-mono text-xs uppercase tracking-wide bg-ink text-paper-hi px-5 py-3 rounded-md hover:bg-[#3a332a] disabled:opacity-50"
          >
            {busy === "retry" ? "Retrying…" : "Retry pipeline →"}
          </button>
        )}
        {canRevise && (
          <button
            onClick={handleRevise}
            disabled={!!busy}
            className="font-mono text-xs uppercase tracking-wide border border-ink px-5 py-3 rounded-md hover:bg-ink hover:text-paper-hi transition-colors disabled:opacity-50"
          >
            {busy === "revise"
              ? "Sending critique back to the editor…"
              : "Send critique back to the editor →"}
          </button>
        )}
        {canEmail && (
          <button
            onClick={handleEmail}
            disabled={!!busy}
            className="font-mono text-xs uppercase tracking-wide border border-rule px-5 py-3 rounded-md hover:border-ink disabled:opacity-50"
          >
            {busy === "email" ? "Sending…" : emailed ? "Sent ✓" : "Email me this resume"}
          </button>
        )}
        {canExport && (
          <>
            <a
              href={`/api/applications/${applicationId}/export?format=pdf`}
              className="font-mono text-xs uppercase tracking-wide border border-rule px-5 py-3 rounded-md hover:border-ink inline-flex items-center"
            >
              Download PDF
            </a>
            <a
              href={`/api/applications/${applicationId}/export?format=docx`}
              className="font-mono text-xs uppercase tracking-wide border border-rule px-5 py-3 rounded-md hover:border-ink inline-flex items-center"
            >
              Download DOCX
            </a>
          </>
        )}
        {canPrepInterview && (
          <button
            onClick={handleInterviewPrep}
            disabled={!!busy}
            className="font-mono text-xs uppercase tracking-wide border border-rule px-5 py-3 rounded-md hover:border-ink disabled:opacity-50"
          >
            {busy === "interview-prep"
              ? "Researching the company…"
              : "Prep me for the interview"}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={!!busy}
          className="font-mono text-xs uppercase tracking-wide text-red px-5 py-3 rounded-md hover:bg-red/10 disabled:opacity-50 ml-auto"
        >
          {busy === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error && <div className="text-red text-sm font-mono">{error}</div>}
    </div>
  );
}

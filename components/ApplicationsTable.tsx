"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  jobTitle: string | null;
  companyName: string | null;
  source: string;
  verdict: string | null;
  matchScore: number | null;
  createdAt: string;
};

const VERDICT_STYLES: Record<string, string> = {
  strong: "border-green text-green",
  stretch: "border-red text-red",
  mismatch: "border-red text-red",
};

export function ApplicationsTable({ applications }: { applications: Row[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this application and all its runs?")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Couldn't delete that application.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  if (applications.length === 0) {
    return (
      <div className="bg-paper-hi border border-rule p-10 text-center text-sm text-ink-soft">
        Nothing yet — run your first application from New Application.
      </div>
    );
  }

  return (
    <div>
      <div className="bg-paper-hi border border-rule overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_2fr] px-5 py-3.5 border-b border-rule text-[11px] text-ink-soft tracking-wide">
            <div>Role / Company</div>
            <div>Source</div>
            <div>Verdict</div>
            <div>Match</div>
            <div>Created</div>
            <div className="text-right">Run</div>
          </div>
          {applications.map((r, i) => (
            <div
              key={r.id}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_2fr] px-5 py-5 items-center ${
                i < applications.length - 1 ? "border-b border-rule" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="font-display font-bold text-[15px] truncate">
                  {r.jobTitle || "Untitled job"}
                </div>
                <div className="text-xs text-ink-soft mt-0.5 truncate">
                  {r.companyName || "—"}
                </div>
              </div>
              <div className="text-[13px] text-ink-soft">{r.source}</div>
              <div>
                {r.verdict ? (
                  <span
                    className={`font-mono text-xs uppercase tracking-wide border px-2.5 py-1 ${
                      VERDICT_STYLES[r.verdict] ?? "border-rule text-ink-soft"
                    }`}
                  >
                    {r.verdict}
                  </span>
                ) : (
                  <span className="text-ink-soft">—</span>
                )}
              </div>
              <div className="font-display font-bold text-sm">
                {r.matchScore != null ? `${r.matchScore}%` : "—"}
              </div>
              <div className="text-[13px] text-ink-soft">{r.createdAt}</div>
              <div className="flex gap-2 justify-end">
                <Link
                  href={`/applications/${r.id}`}
                  className="font-mono text-xs uppercase tracking-wide border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper-hi transition-colors"
                >
                  View Run
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                  className="font-mono text-xs uppercase tracking-wide border border-red text-red px-3 py-1.5 hover:bg-red hover:text-paper-hi transition-colors disabled:opacity-40"
                >
                  {deleting === r.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {error && (
        <p className="text-red text-xs font-mono mt-2">{error}</p>
      )}
    </div>
  );
}

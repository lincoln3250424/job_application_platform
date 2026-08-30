"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResumeItem = {
  id: string;
  label: string;
  isDefault: boolean;
};

export function SidebarResumes({ resumes }: { resumes: ResumeItem[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Couldn't delete that resume.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  if (resumes.length === 0) {
    return (
      <p className="text-xs text-ink-soft italic">
        No saved resumes yet — paste one when you open a new application.
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-1">
        {resumes.map((r) => (
          <li
            key={r.id}
            className="group flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-tab"
          >
            <span className="text-xs text-ink-soft truncate" title={r.label}>
              {r.label}
              {r.isDefault ? " (default)" : ""}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(r.id)}
              disabled={deleting === r.id}
              className="font-mono text-[10px] text-ink-soft opacity-0 group-hover:opacity-100 hover:text-red disabled:opacity-30"
              aria-label={`Delete ${r.label}`}
            >
              {deleting === r.id ? "…" : "×"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-red text-xs font-mono mt-2">{error}</p>}
    </div>
  );
}

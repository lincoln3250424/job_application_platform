"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type ResumeRow = {
  id: string;
  label: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
};

export function ResumeManager({ resumes }: { resumes: ResumeRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this resume? Applications that used it keep their drafts.")) return;
    setBusy(id);
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
      setBusy(null);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (content.trim().length < 40) {
      setError("Resume text looks too short (min 40 characters).");
      return;
    }
    setBusy("new");
    setError(null);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || "My resume",
          content: content.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Couldn't save that resume.");
        return;
      }
      setLabel("");
      setContent("");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl mb-4">Existing resumes</h2>
        {resumes.length === 0 ? (
          <p className="text-ink-soft text-sm italic">
            No existing resumes yet — add one below or paste a new one when you
            open an application.
          </p>
        ) : (
          <ul className="space-y-3">
            {resumes.map((r) => (
              <li
                key={r.id}
                className="bg-paper-hi border border-rule p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-display font-bold">
                    {r.label}
                    {r.isDefault ? (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wide border border-ink px-2 py-0.5">
                        default
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-ink-soft mt-1">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                  <p className="text-sm text-ink-soft mt-2 line-clamp-3 whitespace-pre-wrap">
                    {r.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={busy === r.id}
                  className="shrink-0 font-mono text-xs uppercase tracking-wide border border-red text-red px-3 py-1.5 hover:bg-red hover:text-paper-hi disabled:opacity-40"
                >
                  {busy === r.id ? "…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleAdd} className="bg-paper-hi border border-rule p-6">
        <h2 className="font-display font-bold text-xl mb-4">Add a resume</h2>
        <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
          Label
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Software Engineer - 2026"
          className="w-full border border-rule px-3 py-2 bg-paper text-sm outline-none focus:border-ink mb-3"
        />
        <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
          Resume text
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your resume as plain text."
          className="w-full min-h-[160px] border border-rule px-3 py-2 bg-paper text-sm outline-none focus:border-ink resize-y"
        />
        {error && <div className="text-red text-sm font-mono mt-2">{error}</div>}
        <button
          type="submit"
          disabled={busy === "new"}
          className="mt-3 font-mono text-xs uppercase tracking-wide bg-ink text-paper-hi px-5 py-2.5 hover:bg-[#3a332a] disabled:opacity-40"
        >
          {busy === "new" ? "Saving…" : "Save resume"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ResumeImprovementForm({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [info, setInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = info.trim();
    if (trimmed.length < 10) {
      setError("Add a few sentences of additional information first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalInfo: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The revision pass failed. Try again.");
        return;
      }
      setInfo("");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-tab border border-rule rounded-lg p-5 mt-6"
    >
      <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
        Resume improvement
      </div>
      <h3 className="font-display font-bold text-lg mb-2">
        Add information from the reviewer&rsquo;s critique
      </h3>
      <p className="text-sm text-ink-soft mb-3">
        Paste extra details the reviewer flagged as missing — a real
        accomplishment, metric, tool, or project. The Editor will weave it in
        truthfully and run a new review.
      </p>
      <textarea
        value={info}
        onChange={(e) => setInfo(e.target.value)}
        placeholder="e.g. I led the migration of our dashboard from REST to GraphQL, cutting API latency by 40%..."
        className="w-full min-h-[120px] border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink resize-y"
      />
      {error && <div className="text-red text-sm font-mono mt-2">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="mt-3 font-mono text-xs uppercase tracking-wide bg-ink text-paper-hi px-5 py-2.5 rounded-md hover:bg-[#3a332a] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Revising with this info…" : "Improve resume with this info"}
      </button>
    </form>
  );
}

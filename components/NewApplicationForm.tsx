"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type BaseResume = {
  id: string;
  label: string;
  isDefault: boolean;
};

export function NewApplicationForm({ resumes }: { resumes: BaseResume[] }) {
  const router = useRouter();
  const [jobPostMode, setJobPostMode] = useState<"paste" | "url">("paste");
  const [jobPostText, setJobPostText] = useState("");
  const [jobPostUrl, setJobPostUrl] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [resumeChoice, setResumeChoice] = useState<string>(
    resumes.find((r) => r.isDefault)?.id || (resumes[0]?.id ?? "new")
  );
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const jobPostReady =
    jobPostMode === "paste"
      ? jobPostText.trim().length > 40
      : jobPostUrl.trim().length > 10;
  const ready =
    jobPostReady && (resumeChoice !== "new" || resumeText.trim().length > 40);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(jobPostMode === "paste"
            ? { jobPostText }
            : { jobPostUrl: jobPostUrl.trim() }),
          jobTitle: jobTitle || undefined,
          companyName: companyName || undefined,
          ...(resumeChoice === "new"
            ? { resumeText }
            : { baseResumeId: resumeChoice }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        if (data.applicationId) {
          // Partial failure — the application was created, let them retry from its page.
          router.push(`/applications/${data.applicationId}`);
        }
        return;
      }
      router.push(`/applications/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
            Job title (optional)
          </label>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
            Company (optional)
          </label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            Job post
          </label>
          <div className="flex gap-1 font-mono text-[10.5px] uppercase tracking-wide">
            <button
              type="button"
              onClick={() => setJobPostMode("paste")}
              className={`px-2.5 py-1 rounded ${
                jobPostMode === "paste" ? "bg-ink text-paper-hi" : "text-ink-soft"
              }`}
            >
              Paste text
            </button>
            <button
              type="button"
              onClick={() => setJobPostMode("url")}
              className={`px-2.5 py-1 rounded ${
                jobPostMode === "url" ? "bg-ink text-paper-hi" : "text-ink-soft"
              }`}
            >
              From a URL
            </button>
          </div>
        </div>

        {jobPostMode === "paste" ? (
          <textarea
            required
            value={jobPostText}
            onChange={(e) => setJobPostText(e.target.value)}
            placeholder="Paste the full job posting text here."
            className="w-full min-h-[160px] border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink resize-y"
          />
        ) : (
          <div>
            <input
              type="url"
              required
              value={jobPostUrl}
              onChange={(e) => setJobPostUrl(e.target.value)}
              placeholder="https://company.com/careers/senior-engineer"
              className="w-full border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink"
            />
            <span className="text-[11px] text-ink-soft">
              We&rsquo;ll fetch and extract the posting automatically. Some sites
              block automated requests — if it fails, paste the text instead.
            </span>
          </div>
        )}
      </div>

      <div>
        <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
          Resume
        </label>
        {resumes.length > 0 && (
          <select
            value={resumeChoice}
            onChange={(e) => setResumeChoice(e.target.value)}
            className="w-full border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink mb-2"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
                {r.isDefault ? " (default)" : ""}
              </option>
            ))}
            <option value="new">Paste a new resume…</option>
          </select>
        )}
        {(resumeChoice === "new" || resumes.length === 0) && (
          <textarea
            required
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume as plain text."
            className="w-full min-h-[160px] border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink resize-y"
          />
        )}
      </div>

      {error && <div className="text-red text-sm font-mono">{error}</div>}

      <button
        type="submit"
        disabled={!ready || loading}
        className="font-mono text-xs uppercase tracking-wide bg-ink text-paper-hi px-6 py-3.5 rounded-md hover:bg-[#3a332a] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Running the desk… (can take up to a minute)" : "Open the file →"}
      </button>
    </form>
  );
}


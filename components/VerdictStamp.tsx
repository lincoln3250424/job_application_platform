const STYLES: Record<string, string> = {
  strong: "text-green",
  stretch: "text-amber",
  mismatch: "text-red",
};

const LABELS: Record<string, string> = {
  strong: "Strong Applicant",
  stretch: "Stretch Applicant",
  mismatch: "Mismatch",
};

export function VerdictStamp({ verdict }: { verdict: string }) {
  return (
    <div className="flex justify-center my-3">
      <div
        className={`font-mono font-bold uppercase tracking-wide border-4 rounded-lg px-6 py-3.5 text-sm opacity-90 -rotate-3 ${STYLES[verdict] || "text-ink-soft"}`}
        style={{ borderColor: "currentColor" }}
      >
        {LABELS[verdict] || verdict}
        <div className="block font-mono font-normal text-[9px] tracking-[0.14em] mt-1 opacity-85 normal-case">
          Reviewer&rsquo;s verdict
        </div>
      </div>
    </div>
  );
}

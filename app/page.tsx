import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="font-mono text-[11px] tracking-widest uppercase text-ink-soft mb-3">
        Multi-Agent Application Review
      </div>
      <h1 className="font-display font-black text-4xl sm:text-5xl leading-[1.02] tracking-tight mb-5">
        Run it through <em className="italic font-medium text-blue">the desk</em>.
      </h1>
      <p className="text-ink-soft text-[15.5px] mb-8">
        Paste a job post and your resume. An analyst strips the posting down to
        what&rsquo;s actually required, an editor tailors your resume to match, and a
        skeptical reviewer tries to find the holes before a real interviewer does.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/register"
          className="font-mono text-xs uppercase tracking-wide bg-ink text-paper-hi px-6 py-3.5 rounded-md hover:bg-[#3a332a]"
        >
          Open a file →
        </Link>
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-wide border border-ink px-6 py-3.5 rounded-md hover:bg-ink hover:text-paper-hi transition-colors"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

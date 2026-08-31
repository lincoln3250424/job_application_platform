import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { NavAuthActions } from "@/components/NavAuthActions";
import { SparklesIcon, SettingsIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Job Application AI Helpdesk",
  description:
    "Run your job applications through a four-agent review desk.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-paper text-ink font-mono">
        <header className="border-b border-rule bg-paper">
          <div className="px-7 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-[30px] h-[30px] bg-ink text-paper-hi flex items-center justify-center shrink-0">
                <SparklesIcon className="w-4 h-4" />
              </span>
              <Link
                href={session ? "/applications" : "/"}
                className="font-display font-bold text-[19px] tracking-tight truncate"
              >
                Job Application AI Helpdesk
              </Link>
            </div>

            <div className="flex items-center gap-5 font-mono text-[13px] shrink-0">
              {session ? (
                <>
                  <button
                    type="button"
                    title="Coming soon"
                    className="hidden md:inline-block text-xs uppercase tracking-wide border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper-hi transition-colors"
                  >
                    Extension Capture
                  </button>
                  <Link
                    href="/dashboard?billing=upgrade"
                    title="Settings"
                    aria-label="Settings"
                    className="text-ink-soft hover:text-ink"
                  >
                    <SettingsIcon className="w-[18px] h-[18px]" />
                  </Link>
                  <NavAuthActions loggedIn={!!session} email={session.email} />
                </>
              ) : (
                <NavAuthActions loggedIn={false} />
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 w-full px-5 md:px-8 py-8">{children}</main>
      </body>
    </html>
  );
}

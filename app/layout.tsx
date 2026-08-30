import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { NavAuthActions } from "@/components/NavAuthActions";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "The Desk — Job Application Review",
  description: "Run your job applications through a three-agent review desk.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-rule bg-paper-hi">
          <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
            <Link
              href={session ? "/dashboard" : "/"}
              className="font-display font-extrabold text-lg tracking-tight"
            >
              The Desk
            </Link>
            <NavAuthActions loggedIn={!!session} email={session?.email} />
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-5 py-8">
          {children}
        </main>
        <footer className="border-t border-rule text-center py-6">
          <span className="font-mono text-[10.5px] text-ink-soft">
            Job posts and resumes are stored only for your account.
          </span>
        </footer>
      </body>
    </html>
  );
}

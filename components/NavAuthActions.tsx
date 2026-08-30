"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export function NavAuthActions({
  loggedIn,
  email,
}: {
  loggedIn: boolean;
  email?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!loggedIn) {
    return (
      <div className="flex items-center gap-5 font-mono text-[13px] uppercase tracking-wide">
        <Link href="/login" className="text-ink-soft hover:text-ink underline">
          Log in
        </Link>
        <Link
          href="/register"
          className="bg-ink text-paper-hi px-3.5 py-2 hover:bg-[#3a332a] transition-colors"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const initial = (email?.[0] ?? "U").toUpperCase();

  return (
    <div className="flex items-center gap-3 font-mono text-[13px]">
      <span className="hidden sm:inline text-ink-soft">{email}</span>
      <span className="w-[30px] h-[30px] rounded-full bg-ink text-paper-hi flex items-center justify-center text-[13px] font-bold">
        {initial}
      </span>
      <button
        onClick={handleLogout}
        className="uppercase tracking-wide bg-ink text-paper-hi px-3.5 py-2 hover:bg-[#3a332a] transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

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
      <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-wide">
        <Link href="/login" className="text-ink-soft hover:text-ink">
          Log in
        </Link>
        <Link
          href="/register"
          className="bg-ink text-paper-hi px-3 py-2 rounded-md hover:bg-[#3a332a]"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 font-mono text-xs">
      <span className="text-ink-soft hidden sm:inline">{email}</span>
      <button
        onClick={handleLogout}
        className="uppercase tracking-wide border border-ink rounded-md px-3 py-2 hover:bg-ink hover:text-paper-hi transition-colors"
      >
        Log out
      </button>
    </div>
  );
}

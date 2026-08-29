"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName: displayName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-paper-hi border border-rule rounded-lg p-7">
        <h1 className="font-display font-bold text-2xl mb-1">Open a file</h1>
        <p className="text-ink-soft text-sm mb-6">Create your account.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-rule rounded-md px-3 py-2 bg-paper text-sm outline-none focus:border-ink"
            />
            <span className="text-[11px] text-ink-soft">At least 8 characters.</span>
          </div>
          {error && (
            <div className="text-red text-sm font-mono">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-mono text-xs uppercase tracking-wide bg-ink text-paper-hi px-4 py-3 rounded-md hover:bg-[#3a332a] disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-sm text-ink-soft mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-ink underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

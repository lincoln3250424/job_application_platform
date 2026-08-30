"use client";

import { useState } from "react";

export function SidebarFrame({
  desktopSidebar,
  mobileSidebar,
  children,
}: {
  desktopSidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden mb-4 font-mono text-xs uppercase tracking-wide border border-rule rounded-md px-4 py-2 text-ink-soft hover:text-ink hover:border-ink transition-colors"
      >
        ☰ Menu
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[250px] max-w-[85vw] bg-paper border-r border-rule overflow-y-auto p-5">
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink"
              >
                Close ×
              </button>
            </div>
            {mobileSidebar}
          </div>
        </div>
      )}

      <div className="flex gap-8 lg:gap-10 items-start">
        <div className="hidden md:block w-[250px] shrink-0 sticky top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto pr-1">
          {desktopSidebar}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </>
  );
}

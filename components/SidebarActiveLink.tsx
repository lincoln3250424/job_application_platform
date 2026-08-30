"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarActiveLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`${className ?? ""} ${
        active ? "bg-tab" : "hover:bg-tab"
      }`}
    >
      {children}
    </Link>
  );
}

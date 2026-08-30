"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarActiveLink({
  href,
  className,
  activeClassName,
  children,
}: {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      className={`${className ?? ""} ${
        active ? (activeClassName ?? "bg-tab") : "hover:bg-tab"
      }`}
    >
      {children}
    </Link>
  );
}

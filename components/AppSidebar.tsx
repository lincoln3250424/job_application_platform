import { getSession } from "@/lib/auth";
import { SidebarActiveLink } from "./SidebarActiveLink";
import {
  PlusIcon,
  FolderIcon,
  FileTextIcon,
  BarChartIcon,
} from "./icons";

const NAV = [
  { href: "/dashboard", label: "New Application", Icon: PlusIcon },
  { href: "/applications", label: "Applications History", Icon: FolderIcon },
  { href: "/resumes", label: "Base Resumes", Icon: FileTextIcon },
  { href: "/unit-economics", label: "Unit Economics", Icon: BarChartIcon },
];

export async function AppSidebar() {
  const session = await getSession();
  if (!session) return null; // proxy.ts guards the routes that render this

  return (
    <nav className="space-y-1">
      {NAV.map(({ href, label, Icon }) => (
        <SidebarActiveLink
          key={href}
          href={href}
          className="flex items-center gap-2.5 px-3 py-2.5 font-mono text-sm"
          activeClassName="bg-tab [&>span]:font-display [&>span]:font-bold"
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </SidebarActiveLink>
      ))}
    </nav>
  );
}

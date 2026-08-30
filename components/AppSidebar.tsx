import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/lib/quota";
import { SidebarActiveLink } from "./SidebarActiveLink";
import { SidebarPlan } from "./SidebarPlan";
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

  const [user, quota] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { plan: true, monthlyRunQuota: true },
    }),
    checkQuota(session.userId),
  ]);

  return (
    <div className="space-y-7">
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
      <SidebarPlan
        plan={user.plan}
        monthlyRunQuota={user.monthlyRunQuota}
        used={quota.used}
        quota={quota.quota}
      />
    </div>
  );
}

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarFrame } from "@/components/SidebarFrame";

export default function ApplicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarFrame
      desktopSidebar={<AppSidebar />}
      mobileSidebar={<AppSidebar />}
    >
      {children}
    </SidebarFrame>
  );
}

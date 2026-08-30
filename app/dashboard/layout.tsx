import { AppSidebar } from "@/components/AppSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-8 items-start">
      <AppSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

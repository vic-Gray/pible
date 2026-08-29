import Sidebar from "@/components/layout/Sidebar";
import ProjectSwitcher from "@/components/layout/ProjectSwitcher";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-[calc(224px+12px)] p-6 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <ProjectSwitcher />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

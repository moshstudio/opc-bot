import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className='w-full h-screen flex flex-col'>
        <div className='flex items-center justify-between p-4 border-b'>
          <SidebarTrigger />
          <h1 className='text-xl font-bold'>仪表盘</h1>
          <div className='w-8'></div> {/* Spacer for symmetry */}
        </div>
        <div className='flex-1 overflow-auto'>{children}</div>
      </main>
    </SidebarProvider>
  );
}

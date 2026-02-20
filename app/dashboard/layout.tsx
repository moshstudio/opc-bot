import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ModelProvider } from "@/components/ModelContext";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { SystemStatusIndicator } from "@/components/dashboard/SystemStatusIndicator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ModelProvider>
        <AppSidebar />
        <main className='w-full h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950'>
          {/* Top Bar */}
          <div className='flex items-center justify-between px-6 py-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/70 backdrop-blur-lg'>
            <div className='flex items-center gap-3'>
              <SidebarTrigger />
              <div className='h-5 w-px bg-slate-200 dark:bg-slate-800' />
              <h1 className='text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-wide'>
                一人公司 · 指挥中心
              </h1>
            </div>
            <div className='flex items-center gap-3'>
              <NotificationBell />
              <SystemStatusIndicator />
            </div>
          </div>
          <div className='flex-1 overflow-hidden'>{children}</div>
        </main>
      </ModelProvider>
    </SidebarProvider>
  );
}

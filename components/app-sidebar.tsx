"use client";

import {
  Home,
  Settings,
  Bot,
  Briefcase,
  Database,
  Sparkles,
  Workflow,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { usePathname } from "next/navigation";
import Link from "next/link";

const items = [
  {
    title: "公司概览",
    url: "/dashboard",
    icon: Home,
    color: "text-blue-500",
  },
  {
    title: "工作流管理",
    url: "/dashboard/employees",
    icon: Workflow,
    color: "text-violet-500",
  },
  {
    title: "任务中心",
    url: "/dashboard/tasks",
    icon: Briefcase,
    color: "text-amber-500",
  },
  {
    title: "知识库",
    url: "/dashboard/knowledge",
    icon: Database,
    color: "text-emerald-500",
  },
  {
    title: "模型管理",
    url: "/dashboard/models",
    icon: Bot,
    color: "text-sky-500",
  },
  {
    title: "系统设置",
    url: "/dashboard/settings",
    icon: Settings,
    color: "text-slate-400",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className='border-r-0'>
      <SidebarContent className='bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl'>
        <SidebarGroup>
          <SidebarGroupLabel className='px-4 pt-4 pb-2'>
            <div className='flex items-center gap-2'>
              <div className='p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md'>
                <Sparkles className='h-3.5 w-3.5 text-white' />
              </div>
              <span className='font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400'>
                一人公司
              </span>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className='mt-2'>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== "/dashboard" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`rounded-xl mx-2 transition-all duration-200 ${
                        isActive
                          ? "bg-slate-100 dark:bg-slate-800/80 shadow-sm font-semibold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      }`}
                    >
                      <Link
                        href={item.url}
                        className='flex items-center gap-3 px-3 py-2'
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? item.color : "text-slate-400 dark:text-slate-500"}`}
                        />
                        <span
                          className={`text-sm ${isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}
                        >
                          {item.title}
                        </span>
                        {isActive && (
                          <div className='ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500' />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

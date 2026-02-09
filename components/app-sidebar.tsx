import {
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  User,
  Bot,
  Briefcase,
  Database,
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

// Menu items.
const items = [
  {
    title: "公司",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "员工",
    url: "/dashboard/employees",
    icon: User,
  },
  {
    title: "任务",
    url: "/dashboard/tasks",
    icon: Briefcase,
  },
  {
    title: "知识库",
    url: "/dashboard/knowledge",
    icon: Database,
  },
  {
    title: "设置",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>一人公司</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

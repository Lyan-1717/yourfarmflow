import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Sprout, Activity, Receipt, TrendingUp, FolderKanban, LogOut, Beef,
  Users, Milk, BarChart3, LineChart, HardHat, FileBarChart,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentProjectId, useProjects } from "@/lib/current-project";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const projectId = useCurrentProjectId();
  const { data: projects = [] } = useProjects();
  const current = projects.find((p) => p.id === projectId);
  const t = current?.type;

  const items = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
    { title: "Crops", url: "/crops", icon: Sprout, show: t === "farm" },
    { title: "Livestock", url: "/livestock", icon: Beef, show: t === "livestock" },
    { title: "Animals", url: "/animals", icon: Users, show: t === "livestock" },
    { title: "Milk", url: "/milk", icon: Milk, show: t === "livestock" },
    { title: "Statistics", url: "/statistics", icon: BarChart3, show: t === "livestock" },
    { title: "Projections", url: "/projections", icon: LineChart, show: t === "livestock" },
    { title: "Activities", url: "/activities", icon: Activity, show: t === "farm" },
    { title: "Construction", url: "/construction", icon: HardHat, show: t === "building" },
    { title: "Expenses", url: "/expenses", icon: Receipt, show: true },
    { title: "Income", url: "/income", icon: TrendingUp, show: true },
    { title: "Reports", url: "/reports", icon: FileBarChart, show: true },
    { title: "Projects", url: "/projects", icon: FolderKanban, show: true },
  ].filter((i) => i.show);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <Sprout className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">YourFarmFlow</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Logout">
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
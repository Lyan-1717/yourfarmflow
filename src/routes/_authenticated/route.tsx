import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b px-4 bg-card">
            <SidebarTrigger />
            <h1 className="font-semibold">YourFarmFlow</h1>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
          <footer className="border-t px-4 py-3 text-xs text-muted-foreground bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>© {new Date().getFullYear()} YourFarmFlow</span>
              <span>
                Built by <strong>MURARA Lyan</strong> · +250 795 818 338 ·{" "}
                <a href="mailto:lyanmucyo11@gmail.com" className="underline">lyanmucyo11@gmail.com</a>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
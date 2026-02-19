import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 relative">
          <SidebarTrigger className="fixed top-3 left-3 z-50" />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}

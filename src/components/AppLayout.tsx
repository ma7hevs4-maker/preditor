import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full min-w-0 overflow-hidden">
        <AppSidebar />
        <main className="relative flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}


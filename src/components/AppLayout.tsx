import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full min-w-0 overflow-hidden">
        {/* Hide sidebar on mobile, show bottom nav instead */}
        {!isMobile && <AppSidebar />}
        <main className="relative flex-1 min-w-0 overflow-x-hidden flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          {isMobile && <MobileBottomNav />}
        </main>
      </div>
    </SidebarProvider>
  );
}

import { Zap, Users, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Simulação", url: "/", icon: Zap },
  { title: "Estrutura", url: "/estrutura", icon: Users },
  { title: "Configurações", url: "/config", icon: Settings },
];

export function AppSidebar() {
  const sidebar = useSidebar();
  const state = sidebar?.state ?? "collapsed";
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar
      className={`${collapsed ? "w-14" : "w-52"} transition-all duration-200 border-r border-border bg-card`}
      collapsible="icon"
    >
      <div className="p-3 flex items-center gap-2 border-b border-border">
        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-foreground truncate">Preditor</span>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
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

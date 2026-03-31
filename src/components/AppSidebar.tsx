import { Zap, Users, Settings, Eye, Sun, Moon, ChevronLeft, ChevronRight, CloudSun, HelpCircle, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { AdminConfigDialog } from "@/components/AdminConfigDialog";
import { HelpDialog } from "@/components/HelpDialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Central Climática", url: "/clima", icon: CloudSun },
  { title: "Simulação", url: "/", icon: Zap },
  { title: "Estrutura", url: "/estrutura", icon: Users },
  { title: "Visão", url: "/visao", icon: Eye },
];

export function AppSidebar() {
  const sidebar = useSidebar();
  const state = sidebar?.state ?? "collapsed";
  const collapsed = state === "collapsed";
  const { toggleSidebar } = sidebar;
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar
      className={`${collapsed ? "w-14" : "w-52"} transition-all duration-200 border-r border-border bg-card flex flex-col z-50`}
      collapsible="icon"
    >
      {/* Logo centered */}
      <div className="p-3 flex items-center justify-center border-b border-border h-14">
        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <span className="ml-2 text-sm font-bold text-foreground truncate">Preditor</span>
        )}
      </div>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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

              {/* Configurações — opens AdminConfigDialog */}
              <SidebarMenuItem>
                <AdminConfigDialog
                  trigger={
                    <SidebarMenuButton tooltip="Configurações">
                      <Settings className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">Configurações</span>}
                    </SidebarMenuButton>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: theme toggle + collapse button */}
      <SidebarFooter className="border-t border-border p-2 flex flex-col gap-1">
        <HelpDialog
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex items-center justify-center gap-2 h-9 hover:bg-muted/50"
              title="Ajuda"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="text-xs text-muted-foreground truncate">Ajuda</span>
              )}
            </Button>
          }
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 h-9 hover:bg-muted/50"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && (
            <span className="text-xs text-muted-foreground truncate">
              {theme === "dark" ? "Modo claro" : "Modo escuro"}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 h-9 hover:bg-muted/50"
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 shrink-0" />
            : <ChevronLeft className="w-4 h-4 shrink-0" />}
          {!collapsed && (
            <span className="text-xs text-muted-foreground truncate">Recolher</span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

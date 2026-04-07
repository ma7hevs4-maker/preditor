import { CloudSun, Zap, Users, Eye, BarChart3, Sun, Moon, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import { AdminConfigDialog } from "@/components/AdminConfigDialog";
import { HelpDialog } from "@/components/HelpDialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Settings, HelpCircle } from "lucide-react";

const navItems = [
  { title: "Clima", url: "/clima", icon: CloudSun },
  { title: "Simulação", url: "/", icon: Zap },
  { title: "Estrutura", url: "/estrutura", icon: Users },
  { title: "Visão", url: "/visao", icon: Eye },
  { title: "Oper.", url: "/meu", icon: BarChart3 },
];

export function MobileBottomNav() {
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border flex items-center h-14 px-1 md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[10px] font-medium transition-colors rounded-md",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="truncate">{item.title}</span>
          </NavLink>
        ))}

        {/* More button for theme + settings */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="w-5 h-5" />
              <span>Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <div className="space-y-2 pt-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-base"
                onClick={() => { toggleTheme(); setMoreOpen(false); }}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </Button>

              <AdminConfigDialog
                trigger={
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                    <Settings className="w-5 h-5" />
                    Configurações
                  </Button>
                }
              />

              <HelpDialog
                trigger={
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                    <HelpCircle className="w-5 h-5" />
                    Ajuda
                  </Button>
                }
              />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
      {/* Spacer */}
      <div className="h-14 md:hidden" />
    </>
  );
}

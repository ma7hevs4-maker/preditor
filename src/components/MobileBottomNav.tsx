import { CloudSun, Zap, Users, Eye, BarChart3, Settings, HelpCircle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AdminConfigDialog } from "@/components/AdminConfigDialog";
import { HelpDialog } from "@/components/HelpDialog";
import { useState } from "react";

const navItems = [
  { title: "Clima", url: "/clima", icon: CloudSun },
  { title: "Simulação", url: "/", icon: Zap },
  { title: "Estrutura", url: "/estrutura", icon: Users },
  { title: "Visão", url: "/visao", icon: Eye },
  { title: "Operacional", url: "/meu", icon: BarChart3 },
];

export function MobileBottomNav() {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-14 px-1 md:hidden safe-area-bottom">
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
      </nav>
      {/* Spacer so page content isn't hidden behind the nav */}
      <div className="h-14 md:hidden" />
    </>
  );
}

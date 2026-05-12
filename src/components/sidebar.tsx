"use client";
import { motion } from "framer-motion";
import { LayoutDashboard, Bot, MessageCircle, Send, BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { route: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { route: "builder", label: "Create Agent", Icon: Bot },
  { route: "test", label: "Test Agent", Icon: MessageCircle },
  { route: "publish", label: "Publish", Icon: Send },
  { route: "analytics", label: "Analytics", Icon: BarChart3 },
];

interface SidebarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
}

export function Sidebar({ activeRoute, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-[hsl(var(--sidebar))] h-screen sticky top-0">
      <div className="p-4 border-b border-border">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm leading-tight">Aira Studio</div>
            <div className="text-xs text-muted-foreground leading-tight">Agent Builder</div>
          </div>
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(({ route, label, Icon }) => {
          const isActive = activeRoute === route;
          return (
            <button
              key={route}
              onClick={() => onNavigate(route)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left relative",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-background rounded-lg border border-border shadow-sm"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10 shrink-0" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="text-[10px] text-muted-foreground/60 text-center">
          Free-tier ready · Powered by Groq + Gemini
        </div>
      </div>
    </aside>
  );
}

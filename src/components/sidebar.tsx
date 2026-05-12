"use client";
import { motion } from "framer-motion";
import { LayoutDashboard, Bot, MessageCircle, Send, BarChart3, Sparkles } from "lucide-react";

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
    <aside className="w-56 shrink-0 flex flex-col bg-aira-bg border-r border-aira-line h-screen sticky top-0">
      {/* Brand Section */}
      <div className="p-4 border-b border-aira-line">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-3 group w-full hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-sm text-black flex-shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm text-slate-100 leading-tight">Aira Studio</div>
            <div className="text-xs text-slate-500 leading-tight">Agent Builder</div>
          </div>
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(({ route, label, Icon }) => {
          const isActive = activeRoute === route;
          return (
            <div key={route} className="relative">
              <button
                onClick={() => onNavigate(route)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors duration-150 text-left relative z-10"
                style={{
                  color: isActive ? "#10B981" : "#64748B",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#cbd5e1";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#64748B";
                }}
              >
                {isActive && (
                  <>
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-emerald-500/8 border border-emerald-500/15 rounded-lg"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                    <div className="absolute left-0 w-0.5 h-4 bg-emerald-500 rounded-full" />
                  </>
                )}
                <Icon className="w-4 h-4 relative z-10 shrink-0" />
                <span className="relative z-10">{label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer Status */}
      <div className="p-4 border-t border-aira-line space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-xs">Free tier ready</span>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-aira-card border border-aira-line text-[10px] text-slate-400">
            Groq
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-aira-card border border-aira-line text-[10px] text-slate-400">
            Gemini
          </span>
        </div>
      </div>
    </aside>
  );
}

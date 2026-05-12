"use client";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Dashboard } from "@/components/dashboard";
import { Builder } from "@/components/builder";
import { TestAgent } from "@/components/test-agent";
import { Publish } from "@/components/publish";
import { Analytics } from "@/components/analytics";
import { Button } from "@/components/ui/button";
import { loadState, saveState, createDefaultAgent, type AppState } from "@/lib/agent-state";

const ROUTE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  builder: "Create Agent",
  test: "Test Agent",
  publish: "Publish",
  analytics: "Analytics",
};

export function AiraApp() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [route, setRoute] = useState("dashboard");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleStateChange = useCallback((newState: AppState) => {
    setState(newState);
    saveState(newState);
  }, []);

  function navigate(r: string) {
    setRoute(r);
    if (typeof window !== "undefined") window.location.hash = r;
  }

  function newAgent() {
    const agent = { ...createDefaultAgent(), id: crypto.randomUUID(), name: "Untitled Agent", description: "", knowledge: [], templateId: "custom", createdAt: new Date().toISOString() };
    const newState = { ...state, agents: [...state.agents, agent], activeAgentId: agent.id };
    handleStateChange(newState);
    navigate("builder");
  }

  function reset() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("aira-studio-state");
      window.location.reload();
    }
  }

  const agent = state.agents.find((a) => a.id === state.activeAgentId) || state.agents[0];

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-aira-bg">
      <Sidebar activeRoute={route} onNavigate={navigate} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Radial glow background */}
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: "radial-gradient(ellipse 60% 30% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Topbar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-aira-line bg-aira-bg/80 backdrop-blur-sm sticky top-0 z-10 relative">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">AI agent workspace</p>
            <h1 className="text-xl font-bold text-slate-100">{ROUTE_TITLES[route]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={state.activeAgentId}
              onChange={(e) => handleStateChange({ ...state, activeAgentId: e.target.value })}
              className="h-9 rounded-lg bg-aira-card border border-aira-line text-slate-300 px-3 text-sm focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-48 transition-colors"
            >
              {state.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <Button
              onClick={newAgent}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 text-black font-semibold hover:from-emerald-300 hover:to-emerald-500"
            >
              <Plus className="w-4 h-4" /> New Agent
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
          <div className="p-6 max-w-[1400px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={route}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {route === "dashboard" && <Dashboard state={state} onNavigate={navigate} onNewAgent={newAgent} />}
                {route === "builder" && <Builder state={state} onStateChange={handleStateChange} onNavigate={navigate} onReset={reset} />}
                {route === "test" && <TestAgent state={state} onStateChange={handleStateChange} />}
                {route === "publish" && <Publish state={state} onStateChange={handleStateChange} />}
                {route === "analytics" && <Analytics state={state} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

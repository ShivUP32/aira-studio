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
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeRoute={route} onNavigate={navigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">AI agent workspace</p>
            <h1 className="text-xl font-bold tracking-tight">{ROUTE_TITLES[route]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={state.activeAgentId}
              onChange={(e) => handleStateChange({ ...state, activeAgentId: e.target.value })}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-w-48"
            >
              {state.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <Button onClick={newAgent} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> New Agent
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 max-w-[1400px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={route}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
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

import { Plus } from 'lucide-react'
import { useApp } from '../../lib/store'
import { Button } from '../ui/button'

type Route = 'dashboard' | 'builder' | 'test' | 'publish' | 'analytics'

const PAGE_TITLES: Record<Route, string> = {
  dashboard: 'Dashboard',
  builder: 'Create Agent',
  test: 'Test Agent',
  publish: 'Publish',
  analytics: 'Analytics',
}

interface TopbarProps {
  route: Route
  onNavigate: (route: Route) => void
}

export function Topbar({ route, onNavigate }: TopbarProps) {
  const { state, dispatch } = useApp()

  return (
    <header
      style={{
        height: 64,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        background: 'var(--surface)',
        flexShrink: 0,
      }}
    >
      {/* Left */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          AI Agent Workspace
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
          {PAGE_TITLES[route]}
        </h1>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {state.agents.length > 0 && (
          <select
            value={state.activeAgentId}
            onChange={e => dispatch({ type: 'SET_ACTIVE_AGENT', id: e.target.value })}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              padding: '6px 12px',
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {state.agents.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={() => onNavigate('builder')}
          style={{ gap: 6 }}
        >
          <Plus size={14} strokeWidth={2.5} />
          New Agent
        </Button>
      </div>
    </header>
  )
}

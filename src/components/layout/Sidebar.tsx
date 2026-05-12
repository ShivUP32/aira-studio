import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Bot,
  MessageCircle,
  Send,
  BarChart3,
} from 'lucide-react'

type Route = 'dashboard' | 'builder' | 'test' | 'publish' | 'analytics'

interface SidebarProps {
  route: Route
  onNavigate: (route: Route) => void
}

const navItems: { route: Route; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { route: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { route: 'builder', label: 'Create Agent', Icon: Bot },
  { route: 'test', label: 'Test Agent', Icon: MessageCircle },
  { route: 'publish', label: 'Publish', Icon: Send },
  { route: 'analytics', label: 'Analytics', Icon: BarChart3 },
]

export function Sidebar({ route, onNavigate }: SidebarProps) {
  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}
    >
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 18,
              color: '#0a0c12',
              flexShrink: 0,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', lineHeight: 1.2 }}>
              Aira Studio
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>
              Agent Builder
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 12px' }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 10px' }}>
        {navItems.map(({ route: r, label, Icon }) => {
          const isActive = route === r
          return (
            <button
              key={r}
              onClick={() => onNavigate(r)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: 2,
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 8,
                    background: 'var(--accent-dim)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon size={16} strokeWidth={2} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>v0.1.0 — Beta</div>
      </div>
    </aside>
  )
}

// Re-export AnimatePresence for use elsewhere
export { AnimatePresence }

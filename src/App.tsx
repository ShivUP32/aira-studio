import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppProvider } from './lib/store'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { Dashboard } from './pages/Dashboard'
import { Builder } from './pages/Builder'
import { Test } from './pages/Test'
import { Publish } from './pages/Publish'
import { Analytics } from './pages/Analytics'

export type Route = 'dashboard' | 'builder' | 'test' | 'publish' | 'analytics'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const pageTransition = { duration: 0.25 }

function AppInner() {
  const [route, setRoute] = useState<Route>('dashboard')

  const navigate = (r: Route) => setRoute(r)

  return (
    <div style={{ display: 'flex', flexDirection: 'row', minHeight: '100svh', width: '100%' }}>
      <Sidebar route={route} onNavigate={navigate} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar route={route} onNavigate={navigate} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              {route === 'dashboard' && <Dashboard onNavigate={navigate} />}
              {route === 'builder' && <Builder onNavigate={navigate} />}
              {route === 'test' && <Test />}
              {route === 'publish' && <Publish />}
              {route === 'analytics' && <Analytics />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}

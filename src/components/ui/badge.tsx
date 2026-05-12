import * as React from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'draft' | 'live' | 'error'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    border: '1px solid var(--border-accent)',
  },
  draft: {
    background: 'var(--surface-2)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
  },
  live: {
    background: 'rgba(0,212,160,0.2)',
    color: '#00d4a0',
    border: '1px solid rgba(0,212,160,0.4)',
  },
  error: {
    background: 'rgba(248,113,113,0.15)',
    color: 'var(--red)',
    border: '1px solid rgba(248,113,113,0.3)',
  },
}

export function Badge({ variant = 'default', className, style, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', className)}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </span>
  )
}

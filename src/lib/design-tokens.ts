// Design System Tokens for Aira Studio
// Green Gradient Theme - Dark Mode First

export const colors = {
  // Brand
  primary: '#10B981',       // emerald-500
  primaryDark: '#059669',   // emerald-600
  primaryDarker: '#047857', // emerald-700
  primaryLight: '#34D399',  // emerald-400
  primaryGhost: 'rgba(16, 185, 129, 0.12)',
  primaryBorder: 'rgba(16, 185, 129, 0.25)',

  // Background scale
  bg: '#050C1A',            // near-black navy
  bgCard: '#091323',        // card surface
  bgElevated: '#0E1E35',    // elevated surface
  bgHover: '#112040',       // hover state

  // Text scale
  textPrimary: '#EFF4F8',   // primary text
  textSecondary: '#94A3B8', // secondary / muted
  textTertiary: '#64748B',  // placeholder / disabled

  // Border
  border: '#162135',        // default border
  borderSubtle: '#0F1A2E',  // subtle divider
  borderGreen: 'rgba(16, 185, 129, 0.2)', // green-tinted border

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export const gradients = {
  primary: 'linear-gradient(135deg, #10B981 0%, #059669 60%, #047857 100%)',
  subtle: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.05) 100%)',
  glow: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(16,185,129,0.18) 0%, transparent 70%)',
  hero: 'linear-gradient(135deg, #064E3B 0%, #065F46 40%, #047857 100%)',
  cardSheen: 'linear-gradient(145deg, rgba(16,185,129,0.08) 0%, transparent 60%)',
  text: 'linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)',
} as const;

export const shadows = {
  glow: '0 0 40px rgba(16,185,129,0.12), 0 4px 24px rgba(0,0,0,0.4)',
  card: '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)',
  elevated: '0 4px 6px rgba(0,0,0,0.5), 0 20px 48px rgba(0,0,0,0.4)',
  button: '0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.3)',
  buttonHover: '0 4px 12px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.5)',
} as const;

export const typography = {
  // Font sizes with line heights
  xs: { fontSize: '0.75rem', lineHeight: '1rem' },
  sm: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  base: { fontSize: '1rem', lineHeight: '1.5rem' },
  lg: { fontSize: '1.125rem', lineHeight: '1.75rem' },
  xl: { fontSize: '1.25rem', lineHeight: '1.75rem' },
  '2xl': { fontSize: '1.5rem', lineHeight: '2rem' },
  '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' },
  '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem' },
  display: { fontSize: '3.5rem', lineHeight: '1.1', letterSpacing: '-0.03em' },
} as const;

export const animation = {
  // Framer motion variants (export as objects for reuse)
  fadeUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  },
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.08 } },
  },
  staggerItem: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  },
  spring: { type: 'spring', bounce: 0.15, duration: 0.5 },
  springFast: { type: 'spring', bounce: 0.2, duration: 0.35 },
} as const;

export const spacing = {
  sidebarWidth: '14rem',     // 224px
  topbarHeight: '4rem',      // 64px
  cardPadding: '1.5rem',     // 24px
  sectionGap: '1.5rem',      // 24px
  contentMaxWidth: '1400px',
} as const;

// Tailwind class helpers (composable building blocks)
export const tw = {
  card: 'bg-aira-card border border-aira-line rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)]',
  cardHover: 'hover:border-[rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] transition-all duration-200',
  badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
  badgeGreen: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  badgeDraft: 'bg-white/5 text-slate-400 border border-white/10',
  input: 'bg-aira-card border border-aira-line rounded-lg px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all',
  buttonPrimary: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 shadow-[0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all duration-200 active:scale-[0.98]',
  buttonSecondary: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-slate-100 transition-all duration-200 active:scale-[0.98]',
  buttonGhost: 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-white/8 transition-all duration-150',
  sectionTitle: 'text-sm font-semibold text-slate-200',
  label: 'text-xs font-medium text-slate-400',
  eyebrow: 'text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400',
} as const;

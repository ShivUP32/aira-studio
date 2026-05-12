import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'text-[#0a0c12] hover:brightness-110 active:brightness-95',
        secondary: 'border hover:brightness-110',
        ghost: 'hover:brightness-110',
        destructive: 'text-white hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    const variantStyles: React.CSSProperties = {}
    if (variant === 'primary' || variant === undefined) {
      variantStyles.background = 'var(--accent)'
      variantStyles.color = '#0a0c12'
    } else if (variant === 'secondary') {
      variantStyles.background = 'var(--surface-2)'
      variantStyles.borderColor = 'var(--border)'
      variantStyles.color = 'var(--text)'
    } else if (variant === 'ghost') {
      variantStyles.background = 'transparent'
      variantStyles.color = 'var(--text-secondary)'
    } else if (variant === 'destructive') {
      variantStyles.background = 'var(--red)'
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ ...variantStyles, ...style }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

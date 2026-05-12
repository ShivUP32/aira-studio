import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../lib/utils'
import { buttonVariants, type ButtonProps } from './button.constants'

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

// Re-export constants for backward compatibility
export { buttonVariants, type ButtonProps } from './button.constants'
export { Button }

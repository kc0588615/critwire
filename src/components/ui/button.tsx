import { cn } from '@/utilities/ui'
import { Slot } from '@radix-ui/react-slot'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

// Styled only through the shadcn variables marketing.css re-points
// (primary, foreground), so CMS links follow Critwire's palette. Focus
// is the root's 2px ring; nothing here overrides the outline.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm text-center text-base leading-tight font-bold decoration-2 underline-offset-[0.2em] transition-transform motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:underline',
        outline: 'border-2 border-foreground text-foreground hover:underline',
        link: 'text-foreground underline decoration-1 underline-offset-4 hover:decoration-2',
      },
      size: {
        clear: '',
        default: 'min-h-11 px-5 py-2.5',
        lg: 'min-h-12 px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button: React.FC<ButtonProps> = ({ asChild = false, className, size, variant, ...props }) => {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

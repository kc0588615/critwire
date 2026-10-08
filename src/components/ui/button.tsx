import { cn } from '@/utilities/ui'
import { Slot } from '@radix-ui/react-slot'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

// cw's Button through the shared control layer (portal.css), which reads
// the --fs-* roles; on critwire's pages site.css points them at cw's
// roles, so CMS links follow the theme. cw has one control size, so `lg`
// is `default`, and `clear` (a link) adds nothing. Focus is the root's ring.
const buttonVariants = cva('', {
  variants: {
    variant: {
      default: 'fs-btn fs-btn-primary',
      outline: 'fs-btn fs-btn-secondary',
      link: 'fs-link',
    },
    size: {
      clear: '',
      default: '',
      lg: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

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

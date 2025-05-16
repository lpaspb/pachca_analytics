import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-accent focus:bg-primary-accent active:bg-primary-accent disabled:bg-primary/50 disabled:text-primary-foreground/70",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-accent focus:bg-destructive-accent active:bg-destructive-accent disabled:bg-destructive/50 disabled:text-destructive-foreground/70",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:border-primary active:bg-accent active:border-primary disabled:bg-muted/20 disabled:text-muted disabled:border-muted/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:bg-secondary/80 active:bg-secondary/90 disabled:bg-secondary/40 disabled:text-secondary-foreground/70",
        ghost: "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground active:bg-accent/70 disabled:bg-transparent disabled:text-muted",
        link: "text-primary underline-offset-4 hover:underline focus:underline active:text-primary/80 disabled:text-primary/50 disabled:no-underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 rounded px-2.5 text-xs",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

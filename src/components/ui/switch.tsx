import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

// Обновленный компонент Switch в соответствии с дизайн-системой
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    size?: "default" | "sm" | "lg";
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: { root: "h-5 w-9", thumb: "h-3.5 w-3.5 data-[state=checked]:translate-x-4" },
    default: { root: "h-6 w-11", thumb: "h-4.5 w-4.5 data-[state=checked]:translate-x-5" },
    lg: { root: "h-7 w-14", thumb: "h-5.5 w-5.5 data-[state=checked]:translate-x-7" },
  }

  return (
  <SwitchPrimitives.Root
    className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
        sizeClasses[size].root,
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
          "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
          sizeClasses[size].thumb
      )}
    />
  </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

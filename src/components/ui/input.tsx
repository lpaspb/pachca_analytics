import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: "default" | "sm" | "lg";
}

// Обновленный компонент поля ввода в соответствии с дизайн-системой
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize = "default", ...props }, ref) => {
    const sizeClasses = {
      default: "h-9 py-2 px-3",
      sm: "h-8 py-1 px-2 text-sm",
      lg: "h-10 py-2 px-4",
    };

    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-input bg-background text-foreground text-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
          "hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/5",
          sizeClasses[inputSize],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input"

export { Input }

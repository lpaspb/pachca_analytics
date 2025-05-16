import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Компонент уведомления (Notifications Alert) из дизайн-системы Пачка
const notificationVariants = cva(
  "relative w-full flex items-center p-4 rounded-md",
  {
    variants: {
      variant: {
        info: "bg-primary-soft text-foreground",
        warning: "bg-warning/10 text-foreground",
        error: "bg-destructive/10 text-foreground",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

export interface NotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  icon?: React.ReactNode;
  onClose?: () => void;
}

const NotificationIcon = {
  info: (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
    >
      <path 
        d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99996C18.3334 5.39759 14.6024 1.66663 10 1.66663C5.39765 1.66663 1.66669 5.39759 1.66669 9.99996C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M10 6.66663V9.99996" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M10 13.3334H10.0083" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  ),
  warning: (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="text-warning"
    >
      <path 
        d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99996C18.3334 5.39759 14.6024 1.66663 10 1.66663C5.39765 1.66663 1.66669 5.39759 1.66669 9.99996C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M10 6.66663V9.99996" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M10 13.3334H10.0083" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="text-destructive"
    >
      <path 
        d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99996C18.3334 5.39759 14.6024 1.66663 10 1.66663C5.39765 1.66663 1.66669 5.39759 1.66669 9.99996C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M12.5 7.5L7.5 12.5" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M7.5 7.5L12.5 12.5" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export function Notification({
  className,
  variant,
  icon,
  onClose,
  children,
  ...props
}: NotificationProps) {
  return (
    <div
      className={cn(notificationVariants({ variant }), className)}
      role="alert"
      {...props}
    >
      {icon || NotificationIcon[variant || "info"]}
      <div className="ml-3 flex-grow">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto shrink-0 rounded-full p-1 text-foreground/50 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Закрыть</span>
        </button>
      )}
    </div>
  );
}

export interface NotificationActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function NotificationAction({
  className,
  ...props
}: NotificationActionProps) {
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function NotificationTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("font-medium text-sm leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function NotificationDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-sm opacity-90 mt-1", className)}
      {...props}
    />
  );
} 
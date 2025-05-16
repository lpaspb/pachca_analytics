import * as React from "react";
import { cn } from "@/lib/utils";

// Компонент Tabs (вкладок) из дизайн-системы Пачка
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs должен использоваться внутри <Tabs />");
  }
  return context;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");

  const contextValue = React.useMemo(() => {
    return {
      value: value !== undefined ? value : internalValue,
      onValueChange: (newValue: string) => {
        setInternalValue(newValue);
        onValueChange?.(newValue);
      },
    };
  }, [value, internalValue, onValueChange]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={cn("flex flex-col", className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export function TabsList({
  className,
  children,
  bordered = true,
  ...props
}: TabsListProps) {
  return (
    <div
      className={cn(
        "flex overflow-x-auto", 
        bordered && "border-b border-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

export function TabTrigger({
  className,
  value,
  disabled,
  children,
  ...props
}: TabTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs();
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center px-3 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        isSelected && "border-primary text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

export function TabContent({
  className,
  value,
  forceMount,
  children,
  ...props
}: TabContentProps) {
  const { value: selectedValue } = useTabs();
  const isSelected = selectedValue === value;

  if (!forceMount && !isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      data-state={isSelected ? "active" : "inactive"}
      className={cn(
        "py-4",
        isSelected ? "block" : "hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
} 
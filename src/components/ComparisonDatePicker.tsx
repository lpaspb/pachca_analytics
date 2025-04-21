
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format, subDays, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarDays, ChevronDown } from "lucide-react";
import { DateRangePicker } from "./DateRangePicker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";

interface ComparisonDatePickerProps {
  enabled: boolean;
  onEnableChange: (enabled: boolean) => void;
  comparisonDateRange: DateRange | undefined;
  onComparisonDateChange: (range: DateRange | undefined) => void;
  currentDateRange?: DateRange;
}

export function ComparisonDatePicker({
  enabled,
  onEnableChange,
  comparisonDateRange,
  onComparisonDateChange,
  currentDateRange
}: ComparisonDatePickerProps) {
  const handleQuickSelect = (type: 'previous-period' | 'same-period-last-month' | 'same-period-last-year') => {
    if (!currentDateRange?.from) return;
    
    // Ensure we have both from and to dates, defaulting to the same day if to is missing
    const currentFrom = currentDateRange.from;
    const currentTo = currentDateRange.to || currentDateRange.from;
    
    const daysDiff = Math.round((currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24));
    
    let from: Date, to: Date;
    
    switch (type) {
      case 'previous-period':
        // The previous period of the same duration
        to = subDays(currentFrom, 1);
        from = subDays(to, daysDiff);
        break;
      
      case 'same-period-last-month':
        // Same days but last month
        from = subMonths(currentFrom, 1);
        to = subMonths(currentTo, 1);
        break;
        
      case 'same-period-last-year':
        // Same days but last year
        from = new Date(currentFrom);
        from.setFullYear(from.getFullYear() - 1);
        to = new Date(currentTo);
        to.setFullYear(to.getFullYear() - 1);
        break;
        
      default:
        return;
    }
    
    onComparisonDateChange({ from, to });
  };

  const handleEnableChange = (value: boolean) => {
    onEnableChange(value);
    if (value && currentDateRange?.from) {
      handleQuickSelect('previous-period');
    }
  };
  
  // Automatically set comparison range when currentDateRange changes and comparison is enabled
  useEffect(() => {
    if (enabled && currentDateRange?.from && (!comparisonDateRange?.from || !comparisonDateRange?.to)) {
      handleQuickSelect('previous-period');
    }
  }, [currentDateRange, enabled]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Switch 
          id="comparison-mode" 
          checked={enabled} 
          onCheckedChange={handleEnableChange}
        />
        <Label htmlFor="comparison-mode" className="cursor-pointer">
          Сравнить с другим периодом
        </Label>
      </div>
      
      {enabled && comparisonDateRange?.from && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>
            {format(comparisonDateRange.from, "dd.MM.yyyy", { locale: ru })} - {format(comparisonDateRange.to || comparisonDateRange.from, "dd.MM.yyyy", { locale: ru })}
          </span>
        </div>
      )}
    </div>
  );
}

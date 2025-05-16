import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays, format, differenceInCalendarDays } from "date-fns";
import { ru } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  function handleSelect(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      const days = differenceInCalendarDays(range.to, range.from);
      if (days > 30) {
        const limitedTo = addDays(range.from, 30);
        onDateRangeChange({ from: range.from, to: limitedTo });
        return;
      }
    }
    onDateRangeChange(range);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal bg-secondary",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd.MM.yyyy", { locale: ru })} -{" "}
                  {format(dateRange.to, "dd.MM.yyyy", { locale: ru })}
                </>
              ) : (
                format(dateRange.from, "dd.MM.yyyy", { locale: ru })
              )
            ) : (
              <span>Выберите период</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-card border border-border shadow-lg" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={ru}
            className={cn("p-3 pointer-events-auto bg-card")}
            disabled={(date) => {
              if (!dateRange?.from) return false;
              const from = dateRange.from;
              return (
                differenceInCalendarDays(date, from) > 30 ||
                differenceInCalendarDays(from, date) > 30
              );
            }}
          />
          <div className="text-xs text-muted-foreground px-4 pb-2 pt-1">
            Максимальный период — 1 месяц
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

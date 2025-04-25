import { DateRange } from 'react-day-picker';

/**
 * Извлекает messageId из строки (поддерживает ссылки и просто числа)
 */
export function extractMessageId(input: string): string | null {
  if (/^\d+$/.test(input)) return input;
  const match = input.match(/message=(\d+)/);
  if (match) return match[1];
  return null;
}

/**
 * Универсальный обработчик изменения диапазона дат
 */
export function handleDateRangeChange<T extends { dateRange: { from: Date; to: Date } }>(
  state: T,
  setState: (val: T) => void,
  defaultFrom: Date,
  defaultTo: Date
) {
  return (range: DateRange | undefined) => {
    if (range) {
      setState({
        ...state,
        dateRange: {
          from: range.from || defaultFrom,
          to: range.to || defaultTo,
        },
      });
    }
  };
}

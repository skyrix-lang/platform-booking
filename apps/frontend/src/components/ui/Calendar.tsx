import { useState, useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { toISODate, parseISODate } from "@booking/shared";

interface CalendarProps {
  selectedDate: string;
  minDate: string;
  maxDate?: string;
  onSelect: (date: string) => void;
}

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function Calendar({ selectedDate, minDate, maxDate, onSelect }: CalendarProps) {
  const today = useMemo(() => toISODate(new Date()), []);
  const [viewYear, setViewYear] = useState(() => parseISODate(today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseISODate(today).getMonth());

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [];

    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(toISODate(new Date(viewYear, viewMonth, d)));
    }

    return cells;
  }, [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const minDateObj = parseISODate(minDate);
  const canGoPrev =
    new Date(viewYear, viewMonth) >
    new Date(minDateObj.getFullYear(), minDateObj.getMonth());

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-1 rounded-sm hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wide">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-sm hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400 cursor-pointer transition-colors"
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-center text-[10px] font-medium py-1 ${
              i >= 5
                ? "text-surface-400 dark:text-surface-600"
                : "text-surface-500 dark:text-surface-500"
            }`}
          >
            {label}
          </div>
        ))}

        {days.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`empty-${i}`} />;
          }

          const dayOfWeek = parseISODate(dateStr).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isPast = dateStr < minDate || (maxDate != null && dateStr > maxDate);
          const isInRange = dateStr >= minDate && dateStr <= selectedDate;
          const dayNum = parseISODate(dateStr).getDate();

          let cls =
            "relative flex items-center justify-center h-7 w-full text-xs transition-colors cursor-pointer ";

          if (isPast) {
            cls +=
              "text-surface-300 dark:text-surface-700 cursor-not-allowed ";
          } else if (isSelected) {
            cls += "bg-primary-600 text-white font-semibold ";
          } else if (isToday) {
            cls +=
              "ring-1 ring-inset ring-primary-500 text-primary-600 dark:text-primary-400 font-medium ";
          } else if (isInRange) {
            cls +=
              "bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300 ";
          } else if (isWeekend) {
            cls +=
              "text-surface-400 hover:bg-surface-200 dark:text-surface-500 dark:hover:bg-surface-700 ";
          } else {
            cls +=
              "text-surface-700 hover:bg-surface-200 dark:text-surface-300 dark:hover:bg-surface-700 ";
          }

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className={cls}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}

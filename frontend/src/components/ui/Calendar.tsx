import { useState, useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface CalendarProps {
  selectedDate: string;
  minDate: string;
  onSelect: (date: string) => void;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Calendar({ selectedDate, minDate, onSelect }: CalendarProps) {
  const today = useMemo(() => toISODate(new Date()), []);
  const [viewYear, setViewYear] = useState(() => parseDate(today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseDate(today).getMonth());

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
    month: "long",
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

  const minDateObj = parseDate(minDate);
  const canGoPrev =
    new Date(viewYear, viewMonth) >
    new Date(minDateObj.getFullYear(), minDateObj.getMonth());

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-surface-800 dark:text-surface-100">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-300 cursor-pointer transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-center text-xs font-medium py-1 ${
              i >= 5
                ? "text-surface-400 dark:text-surface-500"
                : "text-surface-500 dark:text-surface-400"
            }`}
          >
            {label}
          </div>
        ))}

        {days.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`empty-${i}`} />;
          }

          const dayOfWeek = parseDate(dateStr).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isPast = dateStr < minDate;
          const isInRange = dateStr >= minDate && dateStr <= selectedDate;
          const dayNum = parseDate(dateStr).getDate();

          let cls =
            "relative flex items-center justify-center h-8 w-full rounded text-sm transition-colors cursor-pointer ";

          if (isPast) {
            cls +=
              "text-surface-300 dark:text-surface-600 cursor-not-allowed ";
          } else if (isSelected) {
            cls += "bg-primary-600 text-white font-semibold ";
          } else if (isToday) {
            cls +=
              "ring-2 ring-primary-500 text-primary-700 dark:text-primary-300 font-semibold ";
          } else if (isInRange) {
            cls +=
              "bg-primary-100 text-primary-700 dark:bg-primary-600/15 dark:text-primary-300 ";
          } else if (isWeekend) {
            cls +=
              "text-surface-400 bg-surface-100 hover:bg-surface-200 dark:text-surface-500 dark:bg-surface-800/50 dark:hover:bg-surface-700 ";
          } else {
            cls +=
              "text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-700 ";
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

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { parseISODate, toISODate } from "@platform-booking/core";
import { cn } from "@platform-booking/ui";
import { formatDayFull } from "./format";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Picks an end date, a month at a time, weeks starting on Monday. The days
 * from `minDate` to the selected one are highlighted, as the booked range.
 */
export function Calendar({
  selectedDate,
  minDate,
  maxDate,
  onSelect,
  labelledBy,
}: {
  selectedDate: string;
  minDate: string;
  maxDate?: string;
  onSelect: (date: string) => void;
  /** The id of the element that names the calendar. */
  labelledBy: string;
}) {
  const [today] = useState(() => toISODate(new Date()));
  const [view, setView] = useState(() => {
    const date = parseISODate(selectedDate);
    return { year: date.getFullYear(), month: date.getMonth() };
  });

  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const count = new Date(view.year, view.month + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: count }, (_, i) =>
        toISODate(new Date(view.year, view.month, i + 1)),
      ),
    ];
  }, [view]);

  const monthLabel = new Date(view.year, view.month).toLocaleDateString(
    "en-US",
    { month: "short", year: "numeric" },
  );
  const move = (step: number) =>
    setView(({ year, month }) => {
      const date = new Date(year, month + step);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  const min = parseISODate(minDate);
  const canGoBack =
    new Date(view.year, view.month) >
    new Date(min.getFullYear(), min.getMonth());

  const navClass =
    "cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div role="group" aria-labelledby={labelledBy} className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className={navClass}
        >
          <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
        <span
          aria-live="polite"
          className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground"
        >
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next month"
          className={navClass}
        >
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            aria-hidden="true"
            className="py-1 text-center text-[10px] font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const dayOfWeek = parseISODate(date).getDay();
          const weekend = dayOfWeek === 0 || dayOfWeek === 6;
          const outOfRange =
            date < minDate || (maxDate !== undefined && date > maxDate);
          const selected = date === selectedDate;
          const inRange = date >= minDate && date <= selectedDate;
          return (
            <button
              key={date}
              type="button"
              disabled={outOfRange}
              aria-pressed={selected}
              aria-label={formatDayFull(date)}
              aria-current={date === today ? "date" : undefined}
              onClick={() => onSelect(date)}
              className={cn(
                "relative flex h-7 w-full cursor-pointer items-center justify-center text-xs transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                outOfRange
                  ? "cursor-not-allowed text-muted-foreground opacity-40"
                  : selected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : date === today
                      ? "font-medium text-primary-soft-foreground ring-1 ring-inset ring-ring"
                      : inRange
                        ? "bg-primary-soft text-primary-soft-foreground"
                        : weekend
                          ? "text-muted-foreground hover:bg-muted"
                          : "text-secondary-foreground hover:bg-muted",
              )}
            >
              {parseISODate(date).getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Calendar } from "@/components/ui/Calendar.tsx";
import type { Platform } from "@/types/index.ts";

interface BookingModalProps {
  platform: Platform;
  onConfirm: (trigram: string, endDate: string) => void;
  onClose: () => void;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateReadable(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000) + 1;
}

export function BookingModal({
  platform,
  onConfirm,
  onClose,
}: BookingModalProps) {
  const today = useMemo(() => toISODate(new Date()), []);
  const [trigram, setTrigram] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const days = diffDays(today, selectedDate);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = trigram.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(trimmed)) {
      setError("Trigram must be exactly 3 letters (e.g. EBE)");
      return;
    }
    onConfirm(trimmed, selectedDate);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-elevated w-full max-w-md mx-4 p-6 transition-colors">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
          Book {platform.name}
        </h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Reserve this platform for your deployment.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="trigram"
              className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1.5"
            >
              Your trigram
            </label>
            <input
              ref={inputRef}
              id="trigram"
              type="text"
              maxLength={3}
              placeholder="EBE"
              value={trigram}
              onChange={(e) => {
                setTrigram(e.target.value.toUpperCase());
                setError("");
              }}
              className="w-full px-3 py-2 rounded-md border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 text-sm font-mono uppercase tracking-widest placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1.5">
              Release date
            </label>
            <div className="bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-md p-3 transition-colors">
              <Calendar
                selectedDate={selectedDate}
                minDate={today}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setError("");
                }}
              />
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
              {formatDateReadable(today)} &rarr;{" "}
              {formatDateReadable(selectedDate)}{" "}
              <span className="text-surface-400 dark:text-surface-500">
                ({days} {days === 1 ? "day" : "days"})
              </span>
            </p>
          </div>

          {error && (
            <p className="text-sm text-error font-medium">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Confirm Booking</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

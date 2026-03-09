import { Button } from "@/components/ui/Button.tsx";
import { Calendar } from "@/components/ui/Calendar.tsx";
import type { Platform } from "@/types/index.ts";
import { isValidTrigram, parseISODate, toISODate } from "@booking/shared";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion } from "motion/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface BookingModalProps {
  platform: Platform;
  onConfirm: (trigram: string, endDate: string) => void;
  onClose: () => void;
}

function formatDateReadable(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function diffDays(a: string, b: string): number {
  const da = parseISODate(a);
  const db = parseISODate(b);
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
    if (!isValidTrigram(trimmed)) {
      setError("Trigram must be exactly 3 letters");
      return;
    }
    onConfirm(trimmed, selectedDate);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-surface-950/50 dark:bg-surface-950/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-sm shadow-elevated w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800">
          <div>
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Book Platform
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              {platform.id.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:text-surface-300 dark:hover:bg-surface-800 cursor-pointer transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="trigram"
              className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5"
            >
              Your trigram name
            </label>
            <input
              ref={inputRef}
              id="trigram"
              type="text"
              maxLength={3}
              placeholder="ABC"
              value={trigram}
              onChange={(e) => {
                setTrigram(e.target.value.toUpperCase());
                setError("");
              }}
              className="w-full px-3 py-2 rounded-sm border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm font-mono uppercase tracking-widest placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Release date
            </label>
            <div className="bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-sm p-3">
              <Calendar
                selectedDate={selectedDate}
                minDate={today}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setError("");
                }}
              />
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 font-mono">
              {formatDateReadable(today)} → {formatDateReadable(selectedDate)}{" "}
              <span className="text-surface-400 dark:text-surface-500">
                ({days}d)
              </span>
            </p>
          </div>

          {error && (
            <p className="text-xs text-error-600 dark:text-error-400 font-medium">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Confirm
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

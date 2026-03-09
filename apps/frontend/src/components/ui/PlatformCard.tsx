import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button.tsx";
import type { Platform, PlatformBooking } from "@/types/index.ts";
import {
  CalendarDaysIcon,
  CubeIcon,
  ServerStackIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

interface PlatformCardProps {
  platform: Platform;
  booking: PlatformBooking | undefined;
  daysLeft: number | null;
  onBook: (platform: Platform) => void;
  onRelease: (platformId: string) => void;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function PlatformCard({
  platform,
  booking,
  daysLeft,
  onBook,
  onRelease,
}: PlatformCardProps) {
  const isBooked = !!booking;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, layout: { duration: 0.25 } }}
      className={`relative bg-white dark:bg-surface-900 border rounded-sm shadow-card flex flex-col transition-colors ${
        isBooked
          ? "border-warning-500/50 dark:border-warning-500/40"
          : "border-success-500/50 dark:border-success-500/40"
      }`}
    >
      <motion.div
        className="absolute inset-x-0 top-0 h-0.5"
        animate={{ backgroundColor: isBooked ? "var(--color-warning-500)" : "var(--color-success-500)" }}
        transition={{ duration: 0.4 }}
      />

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {platform.kubernetes ? (
              <CubeIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
            ) : (
              <ServerStackIcon className="h-4 w-4 text-surface-400 shrink-0" />
            )}
            <h3 className="font-semibold text-surface-900 dark:text-surface-100 truncate">
              {platform.id.toUpperCase()}
            </h3>
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-sm ${
              isBooked
                ? "bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
                : "bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400"
            }`}
          >
            {isBooked ? "Booked" : "Available"}
          </span>
        </div>

        {platform.description && (
          <p className="text-xs text-surface-500 dark:text-surface-400">
            {platform.description}
          </p>
        )}

        {isBooked && booking && (
          <AnimatePresence mode="wait">
            <motion.div
              key="booked"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5 text-sm text-surface-600 dark:text-surface-400"
            >
              <div className="flex items-center gap-2">
                <UserCircleIcon className="h-4 w-4 text-surface-400 dark:text-surface-500" />
                <span className="font-mono font-semibold text-surface-800 dark:text-surface-200">
                  {booking.trigram}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4 text-surface-400 dark:text-surface-500" />
                <span className="text-surface-600 dark:text-surface-400">
                  {formatDate(booking.startDate)} &rarr;{" "}
                  {formatDate(booking.endDate)}
                  {daysLeft !== null && (
                    <span className="text-surface-400 dark:text-surface-500 ml-1">
                      ({daysLeft === 0 ? "last day" : `${daysLeft}d`})
                    </span>
                  )}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="mt-auto border-t border-surface-100 dark:border-surface-800 p-3">
        {isBooked ? (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => onRelease(platform.id)}
          >
            Release
          </Button>
        ) : (
          <Button size="sm" className="w-full" onClick={() => onBook(platform)}>
            Book
          </Button>
        )}
      </div>
    </motion.div>
  );
}

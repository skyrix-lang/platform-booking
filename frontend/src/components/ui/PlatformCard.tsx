import {
  ServerStackIcon,
  UserCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button.tsx";
import type { Platform, PlatformBooking } from "@/types/index.ts";

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
    <div
      className={`bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-card p-5 flex flex-col gap-3 border-l-4 transition-colors ${
        isBooked ? "border-l-amber-500" : "border-l-emerald-500"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ServerStackIcon className="h-5 w-5 text-surface-400" />
          <h3 className="font-semibold text-surface-900 dark:text-white">
            {platform.name}
          </h3>
        </div>
        <span
          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
            isBooked
              ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
          }`}
        >
          {isBooked ? "Booked" : "Available"}
        </span>
      </div>

      {isBooked && booking ? (
        <div className="space-y-1.5 text-sm text-surface-600 dark:text-surface-300">
          <div className="flex items-center gap-1.5">
            <UserCircleIcon className="h-4 w-4 text-surface-400" />
            <span className="font-mono font-semibold text-surface-800 dark:text-surface-100">
              {booking.trigram}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="h-4 w-4 text-surface-400" />
            <span>
              {formatDate(booking.startDate)} &rarr;{" "}
              {formatDate(booking.endDate)}
              {daysLeft !== null && (
                <span className="text-surface-400 ml-1">
                  ({daysLeft === 0 ? "last day" : `${daysLeft}d left`})
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-surface-500 dark:text-surface-400">
          This platform is free to use.
        </p>
      )}

      <div className="mt-auto pt-2">
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
          <Button
            size="sm"
            className="w-full"
            onClick={() => onBook(platform)}
          >
            Book
          </Button>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { getDaysUntil, parseISODate, type Booking } from "@booking/shared";
import platformsConfig from "@booking/shared/platforms";
import { Button } from "@/components/ui/Button.tsx";
import { fetchBookings, deleteBooking } from "@/services/api.ts";
import type { Platform } from "@/types/index.ts";

function formatDate(dateStr: string): string {
  return parseISODate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      const data = await fetchBookings();
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const platforms = platformsConfig.platforms as Platform[];
  const platformMap = useMemo(() => {
    const map = new Map<string, Platform>();
    for (const p of platforms) map.set(p.id, p);
    return map;
  }, [platforms]);

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [bookings],
  );

  const handleRelease = async (platformId: string) => {
    try {
      await deleteBooking(platformId);
      setBookings((prev) => prev.filter((b) => b.platformId !== platformId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release platform");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-surface-500 dark:text-surface-400">
          Loading bookings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-error-100 dark:bg-error-500/15 border border-error-200 dark:border-error-500/30 text-error-700 dark:text-error-400 px-4 py-3 rounded-sm text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div>
        <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Active Bookings
        </h1>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 font-mono">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
        </p>
      </div>

      {sortedBookings.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-sm p-12 text-center">
          <CalendarDaysIcon className="h-10 w-10 text-surface-300 dark:text-surface-600 mx-auto" />
          <p className="mt-3 text-sm text-surface-600 dark:text-surface-400">
            No active bookings
          </p>
          <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
            All platforms are available
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {sortedBookings.map((booking) => {
                  const platform = platformMap.get(booking.platformId);
                  const daysLeft = getDaysUntil(booking.endDate);
                  return (
                    <tr
                      key={booking.platformId}
                      className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-surface-900 dark:text-surface-100">
                        {platform?.name ?? booking.platformId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded-sm">
                          {booking.trigram}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-surface-600 dark:text-surface-400 font-mono text-xs">
                        {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium ${
                            daysLeft === 0
                              ? "bg-error-100 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                              : daysLeft <= 1
                                ? "bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
                                : "bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                          }`}
                        >
                          {daysLeft === 0 ? "Last day" : `${daysLeft}d left`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRelease(booking.platformId)}
                        >
                          Release
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

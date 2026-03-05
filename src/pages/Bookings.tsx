import { useMemo } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button.tsx";
import { useLocalStorage } from "@/hooks/useLocalStorage.ts";
import platformsConfig from "@/config/platforms.json";
import type { Platform, PlatformBooking } from "@/types/index.ts";

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDaysLeft(endDate: string): number {
  const end = new Date(endDate + "T23:59:59");
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

export function Bookings() {
  const [bookings, setBookings] = useLocalStorage<PlatformBooking[]>(
    "platform-bookings",
    [],
  );

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

  const handleRelease = (platformId: string) => {
    setBookings((prev) => prev.filter((b) => b.platformId !== platformId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Active Bookings
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {bookings.length} active{" "}
          {bookings.length === 1 ? "booking" : "bookings"}
        </p>
      </div>

      {sortedBookings.length === 0 ? (
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-card p-12 text-center transition-colors">
          <CalendarDaysIcon className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto" />
          <p className="mt-4 text-surface-600 dark:text-surface-300">
            No active bookings.
          </p>
          <p className="text-sm text-surface-400 dark:text-surface-500 mt-1">
            All platforms are currently available.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-card overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50">
                  <th className="text-left px-4 py-3 font-medium text-surface-600 dark:text-surface-300">
                    Platform
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600 dark:text-surface-300">
                    Trigram
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600 dark:text-surface-300">
                    From
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600 dark:text-surface-300">
                    Until
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600 dark:text-surface-300">
                    Days left
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-surface-600 dark:text-surface-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700/50">
                {sortedBookings.map((booking) => {
                  const platform = platformMap.get(booking.platformId);
                  const daysLeft = getDaysLeft(booking.endDate);
                  return (
                    <tr
                      key={booking.platformId}
                      className="hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-surface-900 dark:text-white">
                        {platform?.name ?? booking.platformId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-surface-700 dark:text-surface-100 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded">
                          {booking.trigram}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-surface-600 dark:text-surface-300">
                        {formatDate(booking.startDate)}
                      </td>
                      <td className="px-4 py-3 text-surface-600 dark:text-surface-300">
                        {formatDate(booking.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            daysLeft === 0
                              ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400"
                              : daysLeft <= 1
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
                          }`}
                        >
                          {daysLeft === 0 ? "Last day" : `${daysLeft}d`}
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

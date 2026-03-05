import { useState, useEffect, useMemo } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { PlatformCard } from "@/components/ui/PlatformCard.tsx";
import { BookingModal } from "@/components/ui/BookingModal.tsx";
import { useLocalStorage } from "@/hooks/useLocalStorage.ts";
import { useDebounce } from "@/hooks/useDebounce.ts";
import platformsConfig from "@/config/platforms.json";
import type { Platform, PlatformBooking } from "@/types/index.ts";

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysLeft(endDate: string): number {
  const end = new Date(endDate + "T23:59:59");
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

type FilterMode = "all" | "available" | "booked";

export function Dashboard() {
  const [bookings, setBookings] = useLocalStorage<PlatformBooking[]>(
    "platform-bookings",
    [],
  );
  const [bookingTarget, setBookingTarget] = useState<Platform | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const debouncedSearch = useDebounce(search, 200);

  useEffect(() => {
    const today = toISODate(new Date());
    setBookings((prev) => prev.filter((b) => b.endDate >= today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookingsByPlatform = useMemo(() => {
    const map = new Map<string, PlatformBooking>();
    for (const b of bookings) {
      map.set(b.platformId, b);
    }
    return map;
  }, [bookings]);

  const platforms = platformsConfig.platforms as Platform[];

  const filteredPlatforms = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return platforms.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        bookingsByPlatform.get(p.id)?.trigram.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filter === "available") return !bookingsByPlatform.has(p.id);
      if (filter === "booked") return bookingsByPlatform.has(p.id);
      return true;
    });
  }, [platforms, debouncedSearch, filter, bookingsByPlatform]);

  const availableCount = platforms.filter(
    (p) => !bookingsByPlatform.has(p.id),
  ).length;

  const handleBook = (trigram: string, endDate: string) => {
    if (!bookingTarget) return;
    const newBooking: PlatformBooking = {
      platformId: bookingTarget.id,
      trigram,
      startDate: toISODate(new Date()),
      endDate,
      bookedAt: new Date().toISOString(),
    };

    setBookings((prev) => [
      ...prev.filter((b) => b.platformId !== bookingTarget.id),
      newBooking,
    ]);
    setBookingTarget(null);
  };

  const handleRelease = (platformId: string) => {
    setBookings((prev) => prev.filter((b) => b.platformId !== platformId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Platforms
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {availableCount} of {platforms.length} platforms available
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search platform or trigram..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-md p-1 transition-colors">
          {(["all", "available", "booked"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded cursor-pointer transition-colors ${
                filter === mode
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm"
                  : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredPlatforms.length === 0 ? (
        <div className="text-center py-12 text-surface-400 dark:text-surface-500">
          No platforms match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlatforms.map((platform) => {
            const booking = bookingsByPlatform.get(platform.id);
            return (
              <PlatformCard
                key={platform.id}
                platform={platform}
                booking={booking}
                daysLeft={booking ? getDaysLeft(booking.endDate) : null}
                onBook={setBookingTarget}
                onRelease={handleRelease}
              />
            );
          })}
        </div>
      )}

      {bookingTarget && (
        <BookingModal
          platform={bookingTarget}
          onConfirm={handleBook}
          onClose={() => setBookingTarget(null)}
        />
      )}
    </div>
  );
}

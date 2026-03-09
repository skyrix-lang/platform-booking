import { useState, useEffect, useMemo, useCallback } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { getDaysUntil, type Booking } from "@booking/shared";
import platformsConfig from "@booking/shared/platforms";
import { PlatformCard } from "@/components/ui/PlatformCard.tsx";
import { BookingModal } from "@/components/ui/BookingModal.tsx";
import { useDebounce } from "@/hooks/useDebounce.ts";
import { fetchBookings, createBooking, deleteBooking } from "@/services/api.ts";
import type { Platform } from "@/types/index.ts";

type FilterMode = "all" | "available" | "booked";

export function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingTarget, setBookingTarget] = useState<Platform | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const debouncedSearch = useDebounce(search, 200);

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

  const bookingsByPlatform = useMemo(() => {
    const map = new Map<string, Booking>();
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

  const handleBook = async (trigram: string, endDate: string) => {
    if (!bookingTarget) return;
    try {
      const newBooking = await createBooking(bookingTarget.id, trigram, endDate);
      setBookings((prev) => [
        ...prev.filter((b) => b.platformId !== bookingTarget.id),
        newBooking,
      ]);
      setBookingTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book platform");
    }
  };

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
          Loading platforms...
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            Platforms
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 font-mono">
            {availableCount}/{platforms.length} available
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search platforms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-sm border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 text-sm placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-px bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-sm p-0.5">
          {(["all", "available", "booked"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm cursor-pointer transition-colors ${
                filter === mode
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm"
                  : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredPlatforms.length === 0 ? (
        <div className="text-center py-16 text-surface-400 dark:text-surface-500 text-sm">
          No platforms found
        </div>
      ) : (
        <LayoutGroup>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredPlatforms.map((platform) => {
                const booking = bookingsByPlatform.get(platform.id);
                return (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    booking={booking}
                    daysLeft={booking ? getDaysUntil(booking.endDate) : null}
                    onBook={setBookingTarget}
                    onRelease={handleRelease}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      )}

      <AnimatePresence>
        {bookingTarget && (
          <BookingModal
            platform={bookingTarget}
            onConfirm={handleBook}
            onClose={() => setBookingTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

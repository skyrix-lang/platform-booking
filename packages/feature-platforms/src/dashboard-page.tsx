import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  getListBookingsQueryKey,
  throwUnexpected,
  useCreateBooking,
  useListBookings,
  useListPlatforms,
  useReleaseBooking,
  useUpdateBooking,
} from "@platform-booking/api";
import type { Booking, Platform } from "@platform-booking/core";
import { cn } from "@platform-booking/ui";
import { BookingDialog, type BookingTarget } from "./booking-dialog";
import { errorMessage } from "./format";
import { ErrorBanner, Loading, PageHeading } from "./parts";
import { PlatformCard } from "./platform-card";

export const PLATFORM_TYPES = ["all", "swarm", "k8s"] as const;
export const AVAILABILITIES = ["all", "available", "booked"] as const;

/** The dashboard's filters, kept in the URL by the app's route. */
export interface DashboardFilters {
  q?: string;
  type?: (typeof PLATFORM_TYPES)[number];
  show?: (typeof AVAILABILITIES)[number];
}

/** Every platform, grouped by kind, with who's on it: book, join or release. */
export function DashboardPage({
  filters,
  onFiltersChange,
}: {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}) {
  const { type = "all", show = "all" } = filters;
  const queryClient = useQueryClient();
  const platformsQuery = useListPlatforms({
    query: { throwOnError: throwUnexpected() },
  });
  const bookingsQuery = useListBookings({
    query: { throwOnError: throwUnexpected() },
  });
  const [target, setTarget] = useState<BookingTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The search box filters as you type; the URL follows a moment later.
  const [search, setSearch] = useState(filters.q ?? "");
  useEffect(() => {
    if (search === (filters.q ?? "")) return;
    const timer = setTimeout(
      () => onFiltersChange({ ...filters, q: search || undefined }),
      200,
    );
    return () => clearTimeout(timer);
  }, [search, filters, onFiltersChange]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
  const failed = (fallback: string) => (cause: unknown) =>
    setError(errorMessage(cause, fallback));
  const create = useCreateBooking({
    mutation: {
      onSettled: refresh,
      onError: failed("Failed to book platform"),
    },
  });
  const update = useUpdateBooking({
    mutation: {
      onSettled: refresh,
      onError: failed("Failed to update booking"),
    },
  });
  const release = useReleaseBooking({
    mutation: {
      onSettled: refresh,
      onError: failed("Failed to release platform"),
    },
  });

  const bookingsByPlatform = useMemo(() => {
    const map = new Map<string, Booking[]>();
    const sorted = [...(bookingsQuery.data ?? [])].sort((a, b) =>
      a.trigram.localeCompare(b.trigram),
    );
    for (const booking of sorted) {
      map.set(booking.platformId, [
        ...(map.get(booking.platformId) ?? []),
        booking,
      ]);
    }
    return map;
  }, [bookingsQuery.data]);

  const platforms = useMemo(
    () =>
      [...(platformsQuery.data ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    [platformsQuery.data],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return platforms.filter((platform) => {
      const bookings = bookingsByPlatform.get(platform.id);
      const matches =
        !query ||
        platform.id.toLowerCase().includes(query) ||
        bookings?.some((b) => b.trigram.toLowerCase().includes(query));
      if (!matches) return false;
      if (type === "k8s" && !platform.kubernetes) return false;
      if (type === "swarm" && platform.kubernetes) return false;
      if (show === "available") return !bookings;
      if (show === "booked") return !!bookings;
      return true;
    });
  }, [platforms, bookingsByPlatform, search, type, show]);

  if (platformsQuery.isPending || bookingsQuery.isPending) {
    return (
      <section className="page-section">
        <div className="page-container">
          <Loading>Loading platforms...</Loading>
        </div>
      </section>
    );
  }

  const available = platforms.filter((p) => !bookingsByPlatform.has(p.id));
  const sections = [
    {
      id: "swarm",
      title: "Swarm Platforms",
      platforms: visible.filter((p) => !p.kubernetes),
    },
    {
      id: "k8s",
      title: "Kubernetes Platforms",
      platforms: visible.filter((p) => p.kubernetes),
    },
  ];

  const confirm = (trigram: string, endDate: string) => {
    if (!target) return;
    if (target.booking) {
      const { platformId, trigram: owner } = target.booking;
      update.mutate({ platformId, trigram: owner, data: { endDate } });
    } else {
      create.mutate({
        data: { platformId: target.platform.id, trigram, endDate },
      });
    }
    setTarget(null);
  };

  const card = (platform: Platform) => (
    <PlatformCard
      key={platform.id}
      platform={platform}
      bookings={bookingsByPlatform.get(platform.id) ?? []}
      onBook={(platform) =>
        setTarget({
          platform,
          takenTrigrams: bookingsByPlatform
            .get(platform.id)
            ?.map((booking) => booking.trigram),
        })
      }
      onEdit={(platform, booking) => setTarget({ platform, booking })}
      onRelease={({ platformId, trigram }) =>
        release.mutate({ platformId, trigram })
      }
    />
  );

  return (
    <section className="page-section">
      <div className="page-container space-y-6">
        {error && (
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        )}

        <PageHeading
          title="Platforms"
          detail={`${available.length}/${platforms.length} available`}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBox value={search} onChange={setSearch} />
          <Segmented
            label="Platform type"
            options={PLATFORM_TYPES}
            value={type}
            name={(mode) =>
              mode === "k8s" ? "K8S" : mode === "swarm" ? "Swarm" : "All"
            }
            onChange={(mode) =>
              onFiltersChange({
                ...filters,
                type: mode === "all" ? undefined : mode,
              })
            }
          />
          <Segmented
            label="Availability"
            options={AVAILABILITIES}
            value={show}
            name={(mode) => mode.charAt(0).toUpperCase() + mode.slice(1)}
            onChange={(mode) =>
              onFiltersChange({
                ...filters,
                show: mode === "all" ? undefined : mode,
              })
            }
          />
        </div>

        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No platforms found
          </p>
        ) : (
          <div className="space-y-8">
            {sections.map(
              (section) =>
                section.platforms.length > 0 && (
                  <section
                    key={section.title}
                    aria-labelledby={`section-${section.id}`}
                  >
                    <h2
                      id={`section-${section.id}`}
                      className="mb-3 text-sm font-semibold text-secondary-foreground"
                    >
                      {section.title}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {section.platforms.map(card)}
                    </div>
                  </section>
                ),
            )}
          </div>
        )}

        <BookingDialog
          target={target}
          onConfirm={confirm}
          onClose={() => setTarget(null)}
        />
      </div>
    </section>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="relative flex-1">
      <label htmlFor={id} className="sr-only">
        Search platforms
      </label>
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={id}
        type="search"
        placeholder="Search platforms..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

/** A row of toggle buttons, one pressed: the dashboard's filters. */
function Segmented<T extends string>({
  label,
  options,
  value,
  name,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  name: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-px rounded-md border bg-muted p-0.5"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            option === value
              ? "bg-card text-foreground shadow-sm"
              : "text-secondary-foreground hover:text-foreground",
          )}
        >
          {name(option)}
        </button>
      ))}
    </div>
  );
}

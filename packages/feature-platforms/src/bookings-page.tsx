import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  getListBookingsQueryKey,
  throwUnexpected,
  useListBookingHistory,
  useListBookings,
  useListPlatforms,
  useReleaseBooking,
  useUpdateBooking,
} from "@platform-booking/api";
import { daysUntil, type Platform } from "@platform-booking/core";
import { Badge, Button } from "@platform-booking/ui";
import { BookingDialog, type BookingTarget } from "./booking-dialog";
import { errorMessage, formatDateTime, formatDay } from "./format";
import {
  ErrorBanner,
  Loading,
  PageHeading,
  PlatformIcon,
  tableHeadClass,
  Trigram,
} from "./parts";

/** The active bookings, soonest end first, and the last three weeks' history. */
export function BookingsPage() {
  const queryClient = useQueryClient();
  const bookings = useListBookings({
    query: { throwOnError: throwUnexpected() },
  });
  const history = useListBookingHistory({
    query: { throwOnError: throwUnexpected() },
  });
  const platforms = useListPlatforms({
    query: { throwOnError: throwUnexpected() },
  });
  const [target, setTarget] = useState<BookingTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
  const update = useUpdateBooking({
    mutation: {
      onSettled: refresh,
      onError: (cause) =>
        setError(errorMessage(cause, "Failed to update booking")),
    },
  });
  const release = useReleaseBooking({
    mutation: {
      onSettled: refresh,
      onError: (cause) =>
        setError(errorMessage(cause, "Failed to release platform")),
    },
  });

  const platformById = useMemo(
    () => new Map((platforms.data ?? []).map((p) => [p.id, p])),
    [platforms.data],
  );
  // A booking may outlive its platform's row for a moment: show its id.
  const platformOf = (id: string): Platform =>
    platformById.get(id) ?? {
      id,
      description: "",
      kubernetes: false,
      nightly: false,
    };
  const active = useMemo(
    () =>
      [...(bookings.data ?? [])].sort((a, b) =>
        a.endDate.localeCompare(b.endDate),
      ),
    [bookings.data],
  );

  if (bookings.isPending) return <Loading>Loading bookings...</Loading>;

  return (
    <div className="space-y-6">
      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      <PageHeading
        title="Active Bookings"
        detail={`${active.length} ${active.length === 1 ? "booking" : "bookings"}`}
      />

      {active.length === 0 ? (
        <EmptyState
          icon={
            <CalendarDays
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-muted-foreground"
            />
          }
        >
          <p className="mt-3 text-sm">No active bookings</p>
          <p className="mt-1 text-xs text-muted-foreground">
            All platforms are available
          </p>
        </EmptyState>
      ) : (
        <Table
          label="Active bookings"
          columns={["Platform", "User", "Period", "Status"]}
          action="Action"
        >
          {active.map((booking) => {
            const platform = platformOf(booking.platformId);
            const daysLeft = daysUntil(booking.endDate);
            const who = `${booking.trigram} on ${platform.id.toUpperCase()}`;
            return (
              <tr
                key={`${booking.platformId}-${booking.trigram}`}
                className="transition-colors hover:bg-secondary"
              >
                <PlatformCell platform={platform} />
                <td className="px-4 py-3">
                  <Trigram value={booking.trigram} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {formatDay(booking.startDate)} → {formatDay(booking.endDate)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className="rounded-md px-1.5"
                    tone={
                      daysLeft === 0
                        ? "danger"
                        : daysLeft <= 1
                          ? "warning"
                          : "success"
                    }
                  >
                    {daysLeft === 0 ? "Last day" : `${daysLeft}d left`}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label={`Edit date for ${who}`}
                    onClick={() => setTarget({ platform, booking })}
                  >
                    Edit date
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label={`Release for ${who}`}
                    onClick={() =>
                      release.mutate({
                        platformId: booking.platformId,
                        trigram: booking.trigram,
                      })
                    }
                  >
                    Release
                  </Button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <div className="mt-10">
        <PageHeading title="History" level={2} detail="Last 3 weeks" />
      </div>

      {history.isPending ? (
        <p
          role="status"
          className="py-8 text-center text-sm text-muted-foreground"
        >
          Loading history...
        </p>
      ) : !history.data?.length ? (
        <EmptyState
          icon={
            <Clock
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-muted-foreground"
            />
          }
        >
          <p className="mt-3 text-sm">No recent history</p>
        </EmptyState>
      ) : (
        <Table
          label="Booking history"
          columns={["Platform", "User", "Period", "Released", "Reason"]}
        >
          {history.data.map((entry, index) => (
            <tr
              key={`${entry.platformId}-${entry.releasedAt}-${index}`}
              className="transition-colors hover:bg-secondary"
            >
              <PlatformCell platform={platformOf(entry.platformId)} />
              <td className="px-4 py-3">
                <Trigram value={entry.trigram} />
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {formatDay(entry.startDate)} → {formatDay(entry.endDate)}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatDateTime(entry.releasedAt)}
              </td>
              <td className="px-4 py-3">
                {entry.reason === "expired" ? (
                  <Badge className="rounded-md px-1.5">Expired</Badge>
                ) : (
                  <Badge className="rounded-md bg-info-soft px-1.5 text-info-soft-foreground">
                    Released
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <BookingDialog
        target={target}
        onConfirm={(_trigram, endDate) => {
          if (target?.booking) {
            const { platformId, trigram } = target.booking;
            update.mutate({ platformId, trigram, data: { endDate } });
          }
          setTarget(null);
        }}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}

function PlatformCell({ platform }: { platform: Platform }) {
  return (
    <td className="px-4 py-3 font-medium">
      <span className="flex items-center gap-2">
        <PlatformIcon kubernetes={platform.kubernetes} />
        {platform.id.toUpperCase()}
      </span>
    </td>
  );
}

function EmptyState({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border bg-card p-12 text-center">
      {icon}
      {children}
    </div>
  );
}

/** A bordered table with a header row; the action column aligns right. */
export function Table({
  label,
  columns,
  action,
  children,
}: {
  label: string;
  columns: string[];
  action?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div
        role="region"
        aria-label={label}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be focusable so keyboard users can scroll it (axe scrollable-region-focusable)
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <table aria-label={label} className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary">
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={`${tableHeadClass} text-left`}
                >
                  {column}
                </th>
              ))}
              {action && (
                <th scope="col" className={`${tableHeadClass} text-right`}>
                  {action}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

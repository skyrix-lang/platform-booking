import { CalendarDays, CircleUserRound } from "lucide-react";
import { daysUntil, type Booking, type Platform } from "@platform-booking/core";
import { Badge, Button, cn } from "@platform-booking/ui";
import { formatDay } from "./format";
import { PlatformIcon } from "./parts";

/** One platform on the dashboard: free (green) or booked (amber), and by whom. */
export function PlatformCard({
  platform,
  bookings,
  onBook,
  onEdit,
  onRelease,
}: {
  platform: Platform;
  bookings: Booking[];
  onBook: (platform: Platform) => void;
  onEdit: (platform: Platform, booking: Booking) => void;
  onRelease: (booking: Booking) => void;
}) {
  const booked = bookings.length > 0;
  const name = platform.id.toUpperCase();

  return (
    <article
      data-testid="platform-card"
      aria-label={name}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-md border bg-card shadow-sm transition-colors motion-safe:animate-pop-in",
        booked ? "border-warning/50" : "border-success/50",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 transition-colors duration-400",
          booked ? "bg-warning" : "bg-success",
        )}
      />

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <PlatformIcon kubernetes={platform.kubernetes} />
            <h3 className="truncate font-semibold">{name}</h3>
          </div>
          <Badge
            tone={booked ? "warning" : "success"}
            className="shrink-0 rounded-md"
          >
            {!booked
              ? "Available"
              : bookings.length > 1
                ? `${bookings.length} users`
                : "Booked"}
          </Badge>
        </div>

        {(platform.description || platform.nightly) && (
          <p className="text-xs text-muted-foreground">
            {platform.nightly ? "Redeployed nightly" : platform.description}
          </p>
        )}

        {bookings.map((booking) => {
          const daysLeft = daysUntil(booking.endDate);
          return (
            <div
              key={booking.trigram}
              className="space-y-1.5 text-sm text-muted-foreground motion-safe:animate-fade-in"
            >
              <div className="flex items-center gap-2">
                <CircleUserRound aria-hidden="true" className="h-4 w-4" />
                <span className="font-mono font-semibold text-foreground">
                  {booking.trigram}
                </span>
                <div className="ml-auto flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label={`Edit date for ${booking.trigram}`}
                    onClick={() => onEdit(platform, booking)}
                  >
                    Edit date
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label={`Release for ${booking.trigram}`}
                    onClick={() => onRelease(booking)}
                  >
                    Release
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                <span>
                  {formatDay(booking.startDate)} → {formatDay(booking.endDate)}
                  <span className="ml-1">
                    ({daysLeft === 0 ? "last day" : `${daysLeft}d`})
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t p-3">
        <Button
          variant={booked ? "secondary" : "primary"}
          size="sm"
          className="w-full text-xs"
          aria-label={`${booked ? "Join" : "Book"} ${name}`}
          onClick={() => onBook(platform)}
        >
          {booked ? "Join" : "Book"}
        </Button>
      </div>
    </article>
  );
}

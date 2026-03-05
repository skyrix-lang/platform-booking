import { useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { useLocalStorage } from "@/hooks/useLocalStorage.ts";
import type { Booking as BookingType, BookingStatus } from "@/types/index.ts";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-warning/10 text-amber-700",
  confirmed: "bg-success/10 text-green-700",
  cancelled: "bg-error/10 text-red-700",
};

const initialBookings: BookingType[] = [
  {
    id: "1",
    title: "Team Sync",
    description: "Weekly team standup meeting",
    date: "2026-03-10",
    time: "09:00",
    duration: 30,
    status: "confirmed",
  },
  {
    id: "2",
    title: "Project Review",
    description: "Q1 project milestone review",
    date: "2026-03-12",
    time: "14:00",
    duration: 60,
    status: "pending",
  },
  {
    id: "3",
    title: "Client Call",
    description: "Onboarding call with new client",
    date: "2026-03-15",
    time: "11:00",
    duration: 45,
    status: "pending",
  },
];

export function Booking() {
  const [bookings, setBookings] = useLocalStorage<BookingType[]>(
    "bookings",
    initialBookings,
  );
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const filteredBookings =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  const updateStatus = (id: string, status: BookingStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Bookings</h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage and track all your appointments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "pending", "confirmed", "cancelled"] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <Card className="text-center py-12">
          <CalendarDaysIcon className="h-12 w-12 text-surface-300 mx-auto" />
          <p className="mt-4 text-surface-500">No bookings found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-surface-900">
                  {booking.title}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[booking.status]}`}
                >
                  {booking.status}
                </span>
              </div>
              <p className="text-sm text-surface-500">{booking.description}</p>
              <div className="text-sm text-surface-400 space-y-1">
                <p>
                  {booking.date} at {booking.time}
                </p>
                <p>{booking.duration} min</p>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-surface-100">
                {booking.status !== "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(booking.id, "confirmed")}
                  >
                    Confirm
                  </Button>
                )}
                {booking.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateStatus(booking.id, "cancelled")}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Booking } from "@booking/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function fetchBookings(): Promise<Booking[]> {
  const res = await fetch(`${API_URL}/api/bookings`);
  if (!res.ok) {
    throw new Error("Failed to fetch bookings");
  }
  return res.json();
}

export async function createBooking(
  platformId: string,
  trigram: string,
  endDate: string,
): Promise<Booking> {
  const res = await fetch(`${API_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platformId, trigram, endDate }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create booking");
  }
  return res.json();
}

export async function deleteBooking(platformId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/bookings/${platformId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete booking");
  }
}

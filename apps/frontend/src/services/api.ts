import type { Booking, BookingHistory, Platform } from "@booking/shared";

const API_URL = import.meta.env.VITE_API_URL || "";

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

export async function fetchBookingHistory(): Promise<BookingHistory[]> {
  const res = await fetch(`${API_URL}/api/bookings/history`);
  if (!res.ok) {
    throw new Error("Failed to fetch booking history");
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

export async function fetchPlatforms(): Promise<Platform[]> {
  const res = await fetch(`${API_URL}/api/platforms`);
  if (!res.ok) {
    throw new Error("Failed to fetch platforms");
  }
  return res.json();
}

export async function createPlatformApi(platform: Platform): Promise<Platform> {
  const res = await fetch(`${API_URL}/api/platforms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(platform),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create platform");
  }
  return res.json();
}

export async function updatePlatformApi(
  currentId: string,
  platform: Platform,
): Promise<Platform> {
  const res = await fetch(`${API_URL}/api/platforms/${currentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(platform),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update platform");
  }
  return res.json();
}

export async function deletePlatformApi(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/platforms/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete platform");
  }
}

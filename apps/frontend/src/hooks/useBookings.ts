import { useState, useEffect, useCallback } from "react";
import type { Booking } from "@booking/shared";
import { fetchBookings } from "@/services/api.ts";

const API_URL = import.meta.env.VITE_API_URL || "";

export function useBookings() {
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

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/events`);
    es.onmessage = (event) => {
      if (event.data === "bookings-updated") {
        loadBookings();
      }
    };
    return () => es.close();
  }, [loadBookings]);

  return { bookings, setBookings, loading, error, setError };
}

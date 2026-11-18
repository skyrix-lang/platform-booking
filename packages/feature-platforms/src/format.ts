import { ApiError } from "@platform-booking/api";
import { parseISODate } from "@platform-booking/core";

// Dates are shown in English, as in the previous version.

/** "Nov 18" */
export function formatDay(iso: string) {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "Tue, Nov 18" */
export function formatDayLong(iso: string) {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "Tuesday, November 18, 2026": what a screen reader says for a day. */
export function formatDayFull(iso: string) {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "Nov 18, 02:30 PM" */
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The API's own message for a refused request, or `fallback`. */
export function errorMessage(error: unknown, fallback: string) {
  if (
    error instanceof ApiError &&
    typeof error.body === "object" &&
    error.body !== null &&
    "error" in error.body &&
    typeof error.body.error === "string"
  ) {
    return error.body.error;
  }
  return fallback;
}

// Booking dates are calendar days, written YYYY-MM-DD, in the local time of
// whoever computes them: the server for "today" when it checks a booking, the
// browser for what it shows. Both run in the same timezone in practice (set
// TZ in the container to the team's zone).

/** The local calendar day of `date`, as YYYY-MM-DD. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Midnight, local time, of a YYYY-MM-DD day. */
export function parseISODate(iso: string): Date {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** True for a real calendar day written YYYY-MM-DD (not 2030-02-30). */
export function isValidISODate(iso: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(iso) && toISODate(parseISODate(iso)) === iso
  );
}

/** `iso` moved by `days` (negative goes back). */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/**
 * Days left until the end of `endDate`, counting today, rounded up: 1 on the
 * last day, 0 only once it has passed. The previous version counted the same
 * way, so the badges show the same numbers.
 */
export function daysUntil(endDate: string, now = new Date()): number {
  const end = parseISODate(endDate);
  end.setHours(23, 59, 59);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

/** Days from `start` to `end`, both included: the same day is 1. */
export function daysBetween(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { bookingHistory, bookings, type Db } from "@platform-booking/db";
import {
  HISTORY_DAYS,
  toISODate,
  type Booking,
  type BookingHistoryEntry,
  type CreateBookingInput,
} from "@platform-booking/core";
import { getDb } from "./db";

// Bookings are shared by the whole team: anyone may book, change or release
// any of them, identified by a trigram, as in the previous version
// (docs/decisions.md, "Open access, shared data").
//
// A booking ends at the end of its end date. Rather than a scheduled job, every
// read and write first moves the bookings that ended into the history, so an
// expired booking is never shown, counted as a conflict or extended.

/** The server's calendar day (set TZ in the container to the team's zone). */
export function today(): string {
  return toISODate(new Date());
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const toBooking = (row: typeof bookings.$inferSelect): Booking => ({
  platformId: row.platformId,
  trigram: row.trigram,
  startDate: row.startDate,
  endDate: row.endDate,
  bookedAt: row.bookedAt.toISOString(),
});

/** Moves the bookings whose end date has passed into the history. */
async function expireBookings(tx: Tx) {
  await tx.execute(sql`
    WITH expired AS (
      DELETE FROM ${bookings} WHERE ${bookings.endDate} < ${today()}
      RETURNING platform_id, trigram, start_date, end_date, booked_at
    )
    INSERT INTO ${bookingHistory}
      (platform_id, trigram, start_date, end_date, booked_at, reason)
    SELECT platform_id, trigram, start_date, end_date, booked_at, 'expired'
    FROM expired
  `);
}

export async function getBookings(): Promise<Booking[]> {
  return getDb().transaction(async (tx) => {
    await expireBookings(tx);
    const rows = await tx
      .select()
      .from(bookings)
      .orderBy(bookings.platformId, bookings.trigram);
    return rows.map(toBooking);
  });
}

/** Bookings that ended in the last weeks, the most recent first. */
export async function getBookingHistory(): Promise<BookingHistoryEntry[]> {
  return getDb().transaction(async (tx) => {
    await expireBookings(tx);
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000);
    const rows = await tx
      .select()
      .from(bookingHistory)
      .where(gte(bookingHistory.releasedAt, since))
      .orderBy(desc(bookingHistory.releasedAt), desc(bookingHistory.id));
    return rows.map((row) => ({
      ...toBooking(row),
      releasedAt: row.releasedAt.toISOString(),
      reason: row.reason,
    }));
  });
}

/** Postgres' foreign key violation, wherever the driver put its code. */
function isForeignKeyViolation(error: unknown): boolean {
  const code = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value
      ? value.code
      : undefined;
  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? error.cause
      : undefined;
  return code(error) === "23503" || code(cause) === "23503";
}

/**
 * Books a platform from today. Returns "taken" when this trigram is already
 * on it, and "missing" when the platform was deleted meanwhile. The caller
 * checks that the platform exists and allows the end date.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<Booking | "taken" | "missing"> {
  try {
    return await getDb().transaction(async (tx) => {
      // An expired booking must not count as a conflict.
      await expireBookings(tx);
      const [row] = await tx
        .insert(bookings)
        .values({ ...input, startDate: today() })
        .onConflictDoNothing()
        .returning();
      return row ? toBooking(row) : "taken";
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) return "missing";
    throw error;
  }
}

/** Returns undefined when there is no such booking. */
export async function updateBookingEndDate(
  platformId: string,
  trigram: string,
  endDate: string,
): Promise<Booking | undefined> {
  return getDb().transaction(async (tx) => {
    // An expired booking goes to the history; a new date doesn't revive it.
    await expireBookings(tx);
    const [row] = await tx
      .update(bookings)
      .set({ endDate })
      .where(
        and(eq(bookings.platformId, platformId), eq(bookings.trigram, trigram)),
      )
      .returning();
    return row && toBooking(row);
  });
}

/** Ends a booking now. Returns false when there is no such booking. */
export async function releaseBooking(
  platformId: string,
  trigram: string,
): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    await expireBookings(tx);
    const released = await tx.execute(sql`
      WITH released AS (
        DELETE FROM ${bookings}
        WHERE ${bookings.platformId} = ${platformId}
          AND ${bookings.trigram} = ${trigram}
        RETURNING platform_id, trigram, start_date, end_date, booked_at
      )
      INSERT INTO ${bookingHistory}
        (platform_id, trigram, start_date, end_date, booked_at, reason)
      SELECT platform_id, trigram, start_date, end_date, booked_at, 'released'
      FROM released
    `);
    return (released.rowCount ?? 0) > 0;
  });
}

/** The latest end date a platform allows: today only for a nightly one. */
export function lastBookableDay(platform: { nightly: boolean }) {
  return platform.nightly ? today() : undefined;
}

import {
  HISTORY_REASONS,
  isValidISODate,
  platformIdSchema,
  trigramSchema,
  type HistoryReason,
} from "@platform-booking/core";

// How the previous version's SQLite rows (platform-booking-old,
// apps/backend/src/db.ts) become rows of the new tables. Pure, so it's tested
// without a database: scripts/import-sqlite.ts reads and writes around it.

export interface LegacyPlatform {
  id: string;
  description: string | null;
  kubernetes: number;
  nightly: number;
}

export interface LegacyBooking {
  platform_id: string;
  trigram: string;
  start_date: string;
  end_date: string;
  booked_at: string;
}

export interface LegacyHistoryEntry extends LegacyBooking {
  released_at: string;
  reason: string;
}

export interface LegacyData {
  /** Undefined when the old database predates editable platforms. */
  platforms?: LegacyPlatform[];
  bookings: LegacyBooking[];
  history: LegacyHistoryEntry[];
}

export interface ImportPlan {
  /** The full platform list to write, or undefined to keep the current one. */
  platforms?: {
    id: string;
    description: string;
    kubernetes: boolean;
    nightly: boolean;
  }[];
  bookings: {
    platformId: string;
    trigram: string;
    startDate: string;
    endDate: string;
    bookedAt: Date;
  }[];
  history: {
    platformId: string;
    trigram: string;
    startDate: string;
    endDate: string;
    bookedAt: Date;
    releasedAt: Date;
    reason: HistoryReason;
  }[];
  /** Rows left out, and why: for the report. */
  skipped: string[];
  /** Bookings on a platform that no longer exists, moved to the history. */
  orphans: number;
}

const platformId = (id: string) => id.trim().toLowerCase();
const trigram = (value: string) => value.trim().toUpperCase();

function timestamp(value: string): Date | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * The rows to write. `existingPlatformIds` is the new database's list, used
 * when the old one has no platforms table. `now` dates the release of
 * bookings whose platform was deleted.
 */
export function planImport(
  legacy: LegacyData,
  existingPlatformIds: string[],
  now: Date,
): ImportPlan {
  const skipped: string[] = [];
  const plan: ImportPlan = { bookings: [], history: [], skipped, orphans: 0 };

  if (legacy.platforms) {
    const seen = new Set<string>();
    plan.platforms = [];
    for (const row of legacy.platforms) {
      // The old app accepted any id; the new one can't address an id with
      // a slash or a space in a URL. Its bookings then go to the history.
      const parsed = platformIdSchema.safeParse(row.id);
      if (!parsed.success) {
        skipped.push(`platform "${row.id}": invalid id`);
        continue;
      }
      const id = parsed.data;
      if (seen.has(id)) {
        skipped.push(`platform "${row.id}": duplicate id`);
        continue;
      }
      seen.add(id);
      plan.platforms.push({
        id,
        description: row.description?.trim() ?? "",
        kubernetes: Boolean(row.kubernetes),
        nightly: Boolean(row.nightly),
      });
    }
  }
  const known = new Set(
    plan.platforms?.map((platform) => platform.id) ?? existingPlatformIds,
  );

  const booked = new Set<string>();
  for (const row of legacy.bookings) {
    const label = `booking ${row.platform_id}/${row.trigram}`;
    const bookedAt = timestamp(row.booked_at);
    if (
      !isValidISODate(row.start_date) ||
      !isValidISODate(row.end_date) ||
      !bookedAt
    ) {
      skipped.push(`${label}: invalid date`);
      continue;
    }
    const booking = {
      platformId: platformId(row.platform_id),
      trigram: trigram(row.trigram),
      startDate: row.start_date,
      endDate: row.end_date,
      bookedAt,
    };
    // An active booking must be one the new app can change and release.
    if (!trigramSchema.safeParse(row.trigram).success) {
      skipped.push(`${label}: invalid trigram`);
      continue;
    }
    const key = `${booking.platformId}/${booking.trigram}`;
    if (booked.has(key)) {
      skipped.push(`${label}: duplicate`);
      continue;
    }
    booked.add(key);
    if (known.has(booking.platformId)) {
      plan.bookings.push(booking);
    } else {
      // The old app kept bookings of deleted platforms; the new one can't.
      plan.orphans++;
      plan.history.push({ ...booking, releasedAt: now, reason: "released" });
    }
  }

  for (const row of legacy.history) {
    const label = `history ${row.platform_id}/${row.trigram}`;
    const bookedAt = timestamp(row.booked_at);
    const releasedAt = timestamp(row.released_at);
    if (
      !isValidISODate(row.start_date) ||
      !isValidISODate(row.end_date) ||
      !bookedAt ||
      !releasedAt
    ) {
      skipped.push(`${label}: invalid date`);
      continue;
    }
    plan.history.push({
      platformId: platformId(row.platform_id),
      trigram: trigram(row.trigram),
      startDate: row.start_date,
      endDate: row.end_date,
      bookedAt,
      releasedAt,
      reason: (HISTORY_REASONS as readonly string[]).includes(row.reason)
        ? (row.reason as HistoryReason)
        : "released",
    });
  }

  return plan;
}

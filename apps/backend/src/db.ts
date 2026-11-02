import Database, { type Database as DatabaseType } from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type Booking,
  type BookingHistory,
  type Platform,
  toISODate,
  normalizeTrigram,
} from "@booking/shared";
import platformsConfig from "@booking/shared/platforms" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || resolve(__dirname, "../data/booking.db");
mkdirSync(dirname(dbPath), { recursive: true });

const db: DatabaseType = new Database(dbPath);

db.pragma("journal_mode = WAL");

const createBookingsTable = `
  CREATE TABLE IF NOT EXISTS bookings (
    platform_id TEXT NOT NULL,
    trigram TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    booked_at TEXT NOT NULL,
    PRIMARY KEY (platform_id, trigram)
  )
`;

db.exec(createBookingsTable);

// Databases created before platforms could be shared have platform_id as the
// only key. SQLite cannot alter a primary key, so the table has to be rebuilt.
const bookingsColumns = db.pragma("table_info(bookings)") as { pk: number }[];
if (bookingsColumns.filter((column) => column.pk > 0).length === 1) {
  db.transaction(() => {
    db.exec("ALTER TABLE bookings RENAME TO bookings_single_user");
    db.exec(createBookingsTable);
    db.exec(`
      INSERT INTO bookings (platform_id, trigram, start_date, end_date, booked_at)
      SELECT platform_id, trigram, start_date, end_date, booked_at
      FROM bookings_single_user
    `);
    db.exec("DROP TABLE bookings_single_user");
  })();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    description TEXT,
    kubernetes INTEGER NOT NULL DEFAULT 0,
    nightly INTEGER NOT NULL DEFAULT 0
  )
`);

// Seed platforms from JSON if table is empty
const platformCount = db.prepare("SELECT COUNT(*) as count FROM platforms").get() as { count: number };
if (platformCount.count === 0) {
  const insert = db.prepare(
    "INSERT INTO platforms (id, description, kubernetes, nightly) VALUES (?, ?, ?, ?)",
  );
  for (const p of (platformsConfig as { platforms: Platform[] }).platforms) {
    insert.run(p.id, p.description ?? null, p.kubernetes ? 1 : 0, p.nightly ? 1 : 0);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS booking_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id TEXT NOT NULL,
    trigram TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    booked_at TEXT NOT NULL,
    released_at TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT 'released'
  )
`);

interface PlatformRow {
  id: string;
  description: string | null;
  kubernetes: number;
  nightly: number;
}

function rowToPlatform(row: PlatformRow): Platform {
  return {
    id: row.id,
    ...(row.description ? { description: row.description } : {}),
    ...(row.kubernetes ? { kubernetes: true } : {}),
    ...(row.nightly ? { nightly: true } : {}),
  };
}

export function getAllPlatforms(): Platform[] {
  const rows = db.prepare("SELECT * FROM platforms ORDER BY id").all() as PlatformRow[];
  return rows.map(rowToPlatform);
}

export function getPlatform(id: string): Platform | undefined {
  const row = db.prepare("SELECT * FROM platforms WHERE id = ?").get(id) as PlatformRow | undefined;
  return row ? rowToPlatform(row) : undefined;
}

export function createPlatform(platform: Platform): Platform {
  db.prepare(
    "INSERT INTO platforms (id, description, kubernetes, nightly) VALUES (?, ?, ?, ?)",
  ).run(platform.id, platform.description ?? null, platform.kubernetes ? 1 : 0, platform.nightly ? 1 : 0);
  return platform;
}

export function updatePlatform(id: string, platform: Platform): boolean {
  const result = db.prepare(
    "UPDATE platforms SET id = ?, description = ?, kubernetes = ?, nightly = ? WHERE id = ?",
  ).run(platform.id, platform.description ?? null, platform.kubernetes ? 1 : 0, platform.nightly ? 1 : 0, id);
  return result.changes > 0;
}

export function deletePlatform(id: string): boolean {
  const result = db.prepare("DELETE FROM platforms WHERE id = ?").run(id);
  return result.changes > 0;
}

interface BookingRow {
  platform_id: string;
  trigram: string;
  start_date: string;
  end_date: string;
  booked_at: string;
}

interface BookingHistoryRow extends BookingRow {
  id: number;
  released_at: string;
  reason: "released" | "expired";
}

function rowToHistory(row: BookingHistoryRow): BookingHistory {
  return {
    platformId: row.platform_id,
    trigram: row.trigram,
    startDate: row.start_date,
    endDate: row.end_date,
    bookedAt: row.booked_at,
    releasedAt: row.released_at,
    reason: row.reason,
  };
}

function rowToBooking(row: BookingRow): Booking {
  return {
    platformId: row.platform_id,
    trigram: row.trigram,
    startDate: row.start_date,
    endDate: row.end_date,
    bookedAt: row.booked_at,
  };
}

export function cleanExpired(): void {
  const today = toISODate(new Date());
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO booking_history (platform_id, trigram, start_date, end_date, booked_at, released_at, reason)
    SELECT platform_id, trigram, start_date, end_date, booked_at, ?, 'expired'
    FROM bookings WHERE end_date < ?
  `).run(now, today);
  db.prepare("DELETE FROM bookings WHERE end_date < ?").run(today);
}

export function getAllBookings(): Booking[] {
  cleanExpired();
  const rows = db.prepare("SELECT * FROM bookings").all() as BookingRow[];
  return rows.map(rowToBooking);
}

/** Returns undefined when this trigram already has this platform booked. */
export function createBooking(
  platformId: string,
  trigram: string,
  endDate: string,
): Booking | undefined {
  // An expired booking must not count as a conflict.
  cleanExpired();

  const booking: Booking = {
    platformId,
    trigram: normalizeTrigram(trigram),
    startDate: toISODate(new Date()),
    endDate,
    bookedAt: new Date().toISOString(),
  };

  const result = db.prepare(`
    INSERT INTO bookings (platform_id, trigram, start_date, end_date, booked_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (platform_id, trigram) DO NOTHING
  `).run(
    booking.platformId,
    booking.trigram,
    booking.startDate,
    booking.endDate,
    booking.bookedAt,
  );

  return result.changes > 0 ? booking : undefined;
}

export function updateBookingEndDate(
  platformId: string,
  trigram: string,
  endDate: string,
): Booking | undefined {
  // An expired booking must go to history, not be revived by a new end date.
  cleanExpired();
  const row = db
    .prepare(
      "UPDATE bookings SET end_date = ? WHERE platform_id = ? AND trigram = ? RETURNING *",
    )
    .get(endDate, platformId, normalizeTrigram(trigram)) as BookingRow | undefined;
  return row ? rowToBooking(row) : undefined;
}

export function deleteBooking(platformId: string, trigram: string): boolean {
  const now = new Date().toISOString();
  const normalized = normalizeTrigram(trigram);
  db.prepare(`
    INSERT INTO booking_history (platform_id, trigram, start_date, end_date, booked_at, released_at, reason)
    SELECT platform_id, trigram, start_date, end_date, booked_at, ?, 'released'
    FROM bookings WHERE platform_id = ? AND trigram = ?
  `).run(now, platformId, normalized);
  const result = db
    .prepare("DELETE FROM bookings WHERE platform_id = ? AND trigram = ?")
    .run(platformId, normalized);
  return result.changes > 0;
}

export function getBookingHistory(since: string): BookingHistory[] {
  const rows = db
    .prepare(
      "SELECT * FROM booking_history WHERE released_at >= ? ORDER BY released_at DESC",
    )
    .all(since) as BookingHistoryRow[];
  return rows.map(rowToHistory);
}

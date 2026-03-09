import Database, { type Database as DatabaseType } from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type Booking,
  toISODate,
  normalizeTrigram,
} from "@booking/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || resolve(__dirname, "../data/booking.db");
mkdirSync(dirname(dbPath), { recursive: true });

const db: DatabaseType = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    platform_id TEXT PRIMARY KEY,
    trigram TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    booked_at TEXT NOT NULL
  )
`);

interface BookingRow {
  platform_id: string;
  trigram: string;
  start_date: string;
  end_date: string;
  booked_at: string;
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
  db.prepare("DELETE FROM bookings WHERE end_date < ?").run(today);
}

export function getAllBookings(): Booking[] {
  cleanExpired();
  const rows = db.prepare("SELECT * FROM bookings").all() as BookingRow[];
  return rows.map(rowToBooking);
}

export function createBooking(
  platformId: string,
  trigram: string,
  endDate: string,
): Booking {
  const booking: Booking = {
    platformId,
    trigram: normalizeTrigram(trigram),
    startDate: toISODate(new Date()),
    endDate,
    bookedAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT OR REPLACE INTO bookings (platform_id, trigram, start_date, end_date, booked_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    booking.platformId,
    booking.trigram,
    booking.startDate,
    booking.endDate,
    booking.bookedAt,
  );

  return booking;
}

export function deleteBooking(platformId: string): boolean {
  const result = db
    .prepare("DELETE FROM bookings WHERE platform_id = ?")
    .run(platformId);
  return result.changes > 0;
}

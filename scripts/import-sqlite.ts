import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-postgres";
import { bookingHistory, bookings, platforms } from "@platform-booking/db";
import { loadEnv } from "./env";
import {
  planImport,
  type LegacyBooking,
  type LegacyData,
  type LegacyHistoryEntry,
  type LegacyPlatform,
} from "./legacy-import";

// yarn db:import-sqlite <file>: copies the previous version's data (its SQLite
// file, /app/data/booking.db in the old image) into this database: the
// platforms, the active bookings and the history. Run it once, after the
// migrations and before people use the new version. The old file is opened
// read-only.
//
// It refuses to run when this database already holds bookings or history, so
// running it twice can't duplicate anything. The platform list is replaced by
// the old one, defaults included.

// Reads a copy, with its -wal and -shm files: the old app used WAL mode, and
// SQLite must create the -shm file to read such a database, which a read-only
// mount of the old volume doesn't allow. The original is never opened.
function readLegacy(file: string): LegacyData {
  const dir = mkdtempSync(join(tmpdir(), "legacy-import-"));
  const copy = join(dir, basename(file));
  for (const suffix of ["", "-wal", "-shm"]) {
    if (existsSync(file + suffix)) copyFileSync(file + suffix, copy + suffix);
  }
  try {
    return readCopy(copy, file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function readCopy(copy: string, file: string): LegacyData {
  const sqlite = new DatabaseSync(copy);
  try {
    const tables = new Set(
      (
        sqlite
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all() as { name: string }[]
      ).map((row) => row.name),
    );
    if (!tables.has("bookings")) {
      throw new Error(`${file} has no bookings table: is it the right file?`);
    }
    const all = <T>(sql: string) => sqlite.prepare(sql).all() as T[];
    return {
      platforms: tables.has("platforms")
        ? all<LegacyPlatform>(
            "SELECT id, description, kubernetes, nightly FROM platforms",
          )
        : undefined,
      bookings: all<LegacyBooking>(
        "SELECT platform_id, trigram, start_date, end_date, booked_at FROM bookings",
      ),
      history: tables.has("booking_history")
        ? all<LegacyHistoryEntry>(
            "SELECT platform_id, trigram, start_date, end_date, booked_at, released_at, reason FROM booking_history ORDER BY id",
          )
        : [],
    };
  } finally {
    sqlite.close();
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: yarn db:import-sqlite <path to booking.db>");
    process.exit(1);
  }
  if (!existsSync(file)) {
    console.error(`No file at ${file}.`);
    process.exit(1);
  }

  const legacy = readLegacy(file);
  loadEnv();
  const db = drizzle(process.env.DATABASE_URL!);
  try {
    const plan = await db.transaction(async (tx) => {
      const existing =
        (await tx.$count(bookings)) + (await tx.$count(bookingHistory));
      if (existing > 0) {
        throw new Error(
          "This database already has bookings or history: nothing imported. " +
            "Import into a freshly migrated database.",
        );
      }
      const current = await tx.select({ id: platforms.id }).from(platforms);
      const plan = planImport(
        legacy,
        current.map((platform) => platform.id),
        new Date(),
      );
      if (plan.platforms) {
        await tx.delete(platforms);
        if (plan.platforms.length) {
          await tx.insert(platforms).values(plan.platforms);
        }
      }
      if (plan.bookings.length) await tx.insert(bookings).values(plan.bookings);
      if (plan.history.length) {
        await tx.insert(bookingHistory).values(plan.history);
      }
      return plan;
    });

    console.log(`Imported from ${file}:
  platforms   ${plan.platforms ? plan.platforms.length : "kept the current list"}
  bookings    ${plan.bookings.length}
  history     ${plan.history.length}${plan.orphans ? ` (${plan.orphans} bookings of deleted platforms, released)` : ""}`);
    for (const reason of plan.skipped) console.warn(`  skipped ${reason}`);
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

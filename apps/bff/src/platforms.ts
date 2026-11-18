import { eq, sql } from "drizzle-orm";
import { bookingHistory, bookings, platforms } from "@platform-booking/db";
import type {
  CreatePlatformInput,
  Platform,
  UpdatePlatformInput,
} from "@platform-booking/core";
import { getDb } from "./db";

// The platforms are shared by the whole team: there is no owner to filter by
// (docs/decisions.md, "Open access, shared data").

const columns = {
  id: platforms.id,
  description: platforms.description,
  kubernetes: platforms.kubernetes,
  nightly: platforms.nightly,
};

export async function getPlatforms(): Promise<Platform[]> {
  return getDb().select(columns).from(platforms).orderBy(platforms.id);
}

export async function getPlatform(id: string): Promise<Platform | undefined> {
  const [platform] = await getDb()
    .select(columns)
    .from(platforms)
    .where(eq(platforms.id, id));
  return platform;
}

/** Returns undefined when a platform with this id already exists. */
export async function createPlatform(
  input: CreatePlatformInput,
): Promise<Platform | undefined> {
  const [platform] = await getDb()
    .insert(platforms)
    .values(input)
    .onConflictDoNothing()
    .returning(columns);
  return platform;
}

/** Returns undefined when there is no such platform. */
export async function updatePlatform(
  id: string,
  input: UpdatePlatformInput,
): Promise<Platform | undefined> {
  const [platform] = await getDb()
    .update(platforms)
    .set(input)
    .where(eq(platforms.id, id))
    .returning(columns);
  return platform;
}

/**
 * Deletes a platform. Its active bookings end as released, so they stay in the
 * history. Returns false when there is no such platform.
 */
export async function deletePlatform(id: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`
      WITH released AS (
        DELETE FROM ${bookings} WHERE ${bookings.platformId} = ${id}
        RETURNING platform_id, trigram, start_date, end_date, booked_at
      )
      INSERT INTO ${bookingHistory}
        (platform_id, trigram, start_date, end_date, booked_at, reason)
      SELECT platform_id, trigram, start_date, end_date, booked_at, 'released'
      FROM released
    `);
    const deleted = await tx
      .delete(platforms)
      .where(eq(platforms.id, id))
      .returning({ id: platforms.id });
    return deleted.length > 0;
  });
}

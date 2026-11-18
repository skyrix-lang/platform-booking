import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { platforms } from "./schema";

/**
 * The platforms a new installation starts with: the list the previous
 * version shipped (platforms.json). People edit them on the /platforms page.
 */
export const DEFAULT_PLATFORMS: (typeof platforms.$inferInsert)[] = [
  { id: "ic01", nightly: true },
  { id: "ic03", nightly: true },
  { id: "ic04" },
  { id: "ic05" },
  { id: "dev01" },
  { id: "dev02" },
  { id: "dev03" },
  { id: "ivt" },
  { id: "freetest" },
  { id: "multi01" },
  { id: "it01", kubernetes: true, nightly: true },
  { id: "it02", kubernetes: true, nightly: true },
  { id: "it03", kubernetes: true, nightly: true },
  { id: "d01", kubernetes: true },
  { id: "d02", kubernetes: true },
  { id: "d03", kubernetes: true },
  { id: "d04", kubernetes: true },
  { id: "d05", kubernetes: true },
  { id: "d06", kubernetes: true },
  { id: "d07", kubernetes: true },
];

/**
 * Adds the default platforms when there are none at all, so it's safe to run
 * on every deploy: a team's own list (or an imported one) is left alone.
 * Returns how many were added.
 */
export async function seedPlatforms(db: NodePgDatabase): Promise<number> {
  if ((await db.$count(platforms)) > 0) return 0;
  await db.insert(platforms).values(DEFAULT_PLATFORMS);
  return DEFAULT_PLATFORMS.length;
}

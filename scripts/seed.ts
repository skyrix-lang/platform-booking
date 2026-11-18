import { drizzle } from "drizzle-orm/node-postgres";
import { seedPlatforms } from "@platform-booking/db/seed";
import { loadEnv } from "./env";

// yarn db:seed: adds the default platforms when the database has none. Safe to
// run on every deploy, after the migrations: an existing list is left alone.
async function main() {
  loadEnv();
  const db = drizzle(process.env.DATABASE_URL!);
  try {
    const added = await seedPlatforms(db);
    console.log(
      added
        ? `Added the ${added} default platforms.`
        : "Platforms already exist: nothing added.",
    );
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

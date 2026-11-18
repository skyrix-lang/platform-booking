import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { HISTORY_REASONS } from "@platform-booking/core";

// The team's test platforms. Shared by everyone: the site has no sign-in, as
// before the migration (docs/decisions.md, "Open access, shared data").
export const platforms = pgTable("platforms", {
  id: text().primaryKey(),
  description: text().notNull().default(""),
  kubernetes: boolean().notNull().default(false),
  // Redeployed every night: bookable for the current day only.
  nightly: boolean().notNull().default(false),
});

// Who is on a platform, until when. Several people can share a platform, each
// once: the key is the platform and the person's trigram. A booking whose end
// date has passed moves to the history (apps/bff/src/bookings.ts).
export const bookings = pgTable(
  "bookings",
  {
    platformId: text("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    trigram: text().notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (booking) => [
    primaryKey({ columns: [booking.platformId, booking.trigram] }),
    // Finds the expired bookings on every read.
    index("bookings_end_date_idx").on(booking.endDate),
  ],
);

export const historyReason = pgEnum("history_reason", HISTORY_REASONS);

// Bookings that ended, released or expired. No foreign key: the history keeps
// the bookings of platforms deleted since.
export const bookingHistory = pgTable(
  "booking_history",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    platformId: text("platform_id").notNull(),
    trigram: text().notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reason: historyReason().notNull(),
  },
  // Serves the history page: the last weeks, newest first.
  (entry) => [index("booking_history_released_at_idx").on(entry.releasedAt)],
);

// Fixed-window counters for apps/bff/src/rate-limit.ts, such as sign-in emails per
// address. A row is reused when its window has passed, and deleted later.
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().primaryKey(),
    count: integer().notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (rateLimit) => [index("rate_limits_reset_at_idx").on(rateLimit.resetAt)],
);

// People who have signed in. A user is identified by their identity provider
// (`oidc_issuer`) and its id for them (`oidc_subject`), never by email, which
// the provider may let them change. The name is refreshed at each sign-in; the
// email is set once, when verified (apps/bff/src/users.ts).
export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text(),
    email: text().unique(),
    oidcIssuer: text("oidc_issuer"),
    oidcSubject: text("oidc_subject"),
  },
  (user) => [
    uniqueIndex("users_oidc_issuer_subject_idx").on(
      user.oidcIssuer,
      user.oidcSubject,
    ),
  ],
);

// Server-side sessions (apps/bff/src/session.ts). The browser holds a random
// token in an HttpOnly cookie; only its SHA-256 hash is stored, so a copy of
// this table can't be used to sign in. Deleting a row signs that session out.
export const userSessions = pgTable(
  "user_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Sent back to the provider on sign-out, so it ends its own session too.
    idToken: text("id_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (session) => [index("user_sessions_user_id_idx").on(session.userId)],
);

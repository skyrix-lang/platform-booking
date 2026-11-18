import { z } from "zod";
import { HISTORY_REASONS } from "./types";

// Shared by the BFF (validation and its OpenAPI spec) and the web app (forms).
// `.meta({ id })` names the schema in the OpenAPI document, so the generated
// client gets a named type.

/** Who booked: three letters, stored in capitals. */
export const trigramSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Trigram must be exactly 3 letters");

/** A platform's id: lowercase letters, digits, dots, dashes and underscores. */
export const platformIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Platform ID is required")
  .max(64)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "Use letters, digits, dots, dashes or underscores",
  );

export const platformSchema = z
  .object({
    id: z.string(),
    description: z.string(),
    kubernetes: z.boolean(),
    /** Redeployed every night: bookable for the current day only. */
    nightly: z.boolean(),
  })
  .meta({ id: "Platform" });

export const createPlatformSchema = z
  .object({
    id: platformIdSchema,
    description: z.string().trim().max(200).default(""),
    kubernetes: z.boolean().default(false),
    nightly: z.boolean().default(false),
  })
  .meta({ id: "CreatePlatform" });

export const updatePlatformSchema = createPlatformSchema
  .omit({ id: true })
  .meta({ id: "UpdatePlatform" });

/**
 * A platform is booked by one or more people, each until their own end date.
 * A booking starts the day it's made.
 */
export const bookingSchema = z
  .object({
    platformId: z.string(),
    trigram: z.string(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    bookedAt: z.iso.datetime({ offset: true }),
  })
  .meta({ id: "Booking" });

export const createBookingSchema = z
  .object({
    platformId: z.string().min(1),
    trigram: trigramSchema,
    endDate: z.iso.date(),
  })
  .meta({ id: "CreateBooking" });

export const updateBookingSchema = z
  .object({ endDate: z.iso.date() })
  .meta({ id: "UpdateBooking" });

export const historyReasonSchema = z
  .enum(HISTORY_REASONS)
  .meta({ id: "HistoryReason" });

/** A booking that ended: released by someone, or expired after its end date. */
export const bookingHistoryEntrySchema = bookingSchema
  .extend({
    releasedAt: z.iso.datetime({ offset: true }),
    reason: historyReasonSchema,
  })
  .meta({ id: "BookingHistoryEntry" });

export type CreatePlatformInput = z.infer<typeof createPlatformSchema>;
export type UpdatePlatformInput = z.infer<typeof updatePlatformSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

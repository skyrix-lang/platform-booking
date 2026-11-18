import type { z } from "zod";
import type {
  bookingHistoryEntrySchema,
  bookingSchema,
  platformSchema,
} from "./booking-schema";

/** Why a booking left the active list. */
export const HISTORY_REASONS = ["released", "expired"] as const;

export type HistoryReason = (typeof HISTORY_REASONS)[number];

/** How far back the history goes, in days. */
export const HISTORY_DAYS = 21;

export type Platform = z.infer<typeof platformSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type BookingHistoryEntry = z.infer<typeof bookingHistoryEntrySchema>;

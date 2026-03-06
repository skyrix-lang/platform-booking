// Re-export shared types
export type { Platform, Booking } from "@booking/shared";

// Frontend-specific alias for backwards compatibility
export type { Booking as PlatformBooking } from "@booking/shared";

// Frontend-only types
export interface NavLink {
  label: string;
  to: string;
}

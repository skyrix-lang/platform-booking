// ============================================================================
// Domain Types
// ============================================================================

export interface Platform {
  id: string;
  description?: string;
  kubernetes?: boolean;
  nightly?: boolean;
}

export interface Booking {
  platformId: string;
  trigram: string;
  startDate: string;
  endDate: string;
  bookedAt: string;
}

export interface BookingHistory extends Booking {
  releasedAt: string;
  reason: "released" | "expired";
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateBookingRequest {
  platformId: string;
  trigram: string;
  endDate: string;
}

export interface DeleteBookingRequest {
  platformId: string;
}

export interface DeleteBookingResponse {
  ok: boolean;
}

export interface ErrorResponse {
  error: string;
}

export interface HealthResponse {
  status: string;
}

// ============================================================================
// API Type Helpers
// ============================================================================

export type ApiResponse<T> = T | ErrorResponse;

export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof (response as ErrorResponse).error === "string"
  );
}

// ============================================================================
// Validation
// ============================================================================

export const TRIGRAM_REGEX = /^[A-Z]{3}$/;

export function isValidTrigram(trigram: string): boolean {
  return TRIGRAM_REGEX.test(trigram.trim().toUpperCase());
}

export function normalizeTrigram(trigram: string): string {
  return trigram.trim().toUpperCase();
}

// ============================================================================
// Date Utilities
// ============================================================================

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getDaysUntil(endDate: string): number {
  const end = new Date(endDate + "T23:59:59");
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

export function isExpired(endDate: string): boolean {
  return endDate < toISODate(new Date());
}

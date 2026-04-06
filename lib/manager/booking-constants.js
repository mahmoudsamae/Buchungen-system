/** DB + API booking statuses (snake_case). */
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled"
];

export const BOOKING_STATUS_SET = new Set(BOOKING_STATUSES);

/** Appointments that still occupy the calendar for conflict checks. */
export const BOOKING_OVERLAP_STATUSES = ["pending", "confirmed"];

/** Cannot change date/time while in these states. */
export const BOOKING_NON_RESCHEDULABLE_STATUSES = ["cancelled", "completed", "no_show"];

/** Terminal / inactive on calendar — hide reschedule & most actions. */
export const BOOKING_TERMINAL_STATUSES = ["cancelled", "completed", "no_show"];

export function isBookingStatus(value) {
  return typeof value === "string" && BOOKING_STATUS_SET.has(value);
}

export function normalizeStatusOrDefault(value, fallback) {
  return isBookingStatus(value) ? value : fallback;
}

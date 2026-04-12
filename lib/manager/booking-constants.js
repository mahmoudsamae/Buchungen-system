/** DB + API booking statuses (snake_case). */
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "rejected",
  "cancelled_by_user",
  "cancelled_by_manager",
  "completed",
  "no_show",
  "expired"
];

export const BOOKING_STATUS_SET = new Set(BOOKING_STATUSES);

/** Legacy aliases that may still appear in old rows. */
export const BOOKING_STATUS_ALIASES = {
  cancelled: "cancelled_by_manager",
  canceled: "cancelled_by_manager",
  rescheduled: "confirmed"
};

/** Appointments that still occupy the calendar for conflict checks. */
export const BOOKING_OVERLAP_STATUSES = ["pending", "confirmed"];

/** Cannot change date/time while in these states. */
export const BOOKING_NON_RESCHEDULABLE_STATUSES = [
  "rejected",
  "cancelled_by_user",
  "cancelled_by_manager",
  "completed",
  "no_show",
  "expired"
];

/** Terminal / inactive on calendar — hide reschedule & most actions. */
export const BOOKING_TERMINAL_STATUSES = [
  "rejected",
  "cancelled_by_user",
  "cancelled_by_manager",
  "completed",
  "no_show",
  "expired"
];

export function isBookingStatus(value) {
  return typeof value === "string" && BOOKING_STATUS_SET.has(value);
}

export function normalizeStatusOrDefault(value, fallback) {
  const normalized = normalizeBookingStatus(value);
  return normalized || fallback;
}

/**
 * Normalize DB/API status (including legacy aliases) to canonical snake_case.
 * Returns null for unknown values.
 */
export function normalizeBookingStatus(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  const mapped = BOOKING_STATUS_ALIASES[raw] || raw;
  return BOOKING_STATUS_SET.has(mapped) ? mapped : null;
}

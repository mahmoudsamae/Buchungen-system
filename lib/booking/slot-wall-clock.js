import { calendarDateInTimeZone, zonedStartToUtcDate } from "@/lib/booking/zoned";

/**
 * Start instant of a wall-clock slot in the business timezone, as a UTC Date.
 */
export function bookingWallStartAsUtc(bookingDateYmd, startHHMM, timeZone) {
  const d = String(bookingDateYmd).slice(0, 10);
  const t = String(startHHMM || "").slice(0, 5);
  return zonedStartToUtcDate(d, t, timeZone || "UTC");
}

/**
 * True iff the slot's start time in the business TZ is strictly after `now` (UTC instant).
 * Used so blocks that already began today are not bookable.
 */
export function isSlotStartStrictlyInFuture(bookingDateYmd, startHHMM, timeZone, now = new Date()) {
  return bookingWallStartAsUtc(bookingDateYmd, startHHMM, timeZone).getTime() > now.getTime();
}

/**
 * Remove slots that are not bookable anymore: whole dates before "today" in business TZ,
 * and on today any slot whose start is not strictly in the future.
 */
export function filterSlotsToFutureWallClock(slots, dateYmd, timeZone, now = new Date()) {
  const d = String(dateYmd).slice(0, 10);
  const tz = timeZone || "UTC";
  const today = calendarDateInTimeZone(tz, now);
  if (d < today) return [];
  if (d > today) return [...(slots || [])];
  return (slots || []).filter((s) => isSlotStartStrictlyInFuture(d, s.start, tz, now));
}

/**
 * Server-side booking guard: same definition of "past" as slot listing.
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
export function assertBookingWallClockBookable({
  bookingDateYmd,
  startHHMM,
  timeZone,
  now = new Date()
}) {
  const d = String(bookingDateYmd).slice(0, 10);
  const tz = timeZone || "UTC";
  const today = calendarDateInTimeZone(tz, now);
  if (d < today) {
    return {
      ok: false,
      status: 400,
      message: "This date is in the past. Please choose a future date."
    };
  }
  if (!isSlotStartStrictlyInFuture(d, startHHMM, tz, now)) {
    return {
      ok: false,
      status: 400,
      message: "This time has already passed. Refresh the page and choose an available time."
    };
  }
  return { ok: true };
}

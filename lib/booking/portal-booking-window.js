import { addDaysToYmd, calendarDateInTimeZone, nextWeekYmdRangeInTimeZone } from "@/lib/booking/zoned";

export function resolvePortalBookingWindow(business, now = new Date()) {
  const tz = String(business?.timezone || "UTC");
  const mode = String(business?.portal_booking_window_mode || "rolling") === "next_week_only"
    ? "next_week_only"
    : "rolling";
  if (mode === "next_week_only") {
    const nextWeek = nextWeekYmdRangeInTimeZone(tz, now);
    return { mode, start: nextWeek.start, end: nextWeek.end, timeZone: tz };
  }
  const today = calendarDateInTimeZone(tz, now);
  return { mode, start: today, end: addDaysToYmd(today, 30), timeZone: tz };
}

export function isDateInsidePortalBookingWindow(dateYmd, window) {
  const d = String(dateYmd || "").slice(0, 10);
  if (!d || !window?.start || !window?.end) return false;
  return d >= window.start && d <= window.end;
}

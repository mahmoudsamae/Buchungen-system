import { addDays, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/** Today's calendar date YYYY-MM-DD in the business IANA timezone. */
export function calendarDateInTimeZone(timeZone, instant = new Date()) {
  const z = toZonedTime(instant, timeZone);
  return format(z, "yyyy-MM-dd");
}

/** Monday-start week [start, end] as YYYY-MM-DD in `timeZone`. */
export function weekYmdRangeInTimeZone(timeZone, instant = new Date()) {
  const z = toZonedTime(instant, timeZone);
  const ws = startOfWeek(z, { weekStartsOn: 1 });
  const we = endOfWeek(z, { weekStartsOn: 1 });
  return { start: format(ws, "yyyy-MM-dd"), end: format(we, "yyyy-MM-dd") };
}

/** Calendar month [start, end] as YYYY-MM-DD in `timeZone`. */
export function monthYmdRangeInTimeZone(timeZone, instant = new Date()) {
  const z = toZonedTime(instant, timeZone);
  const ms = startOfMonth(z);
  const me = endOfMonth(z);
  return { start: format(ms, "yyyy-MM-dd"), end: format(me, "yyyy-MM-dd") };
}

/** Strictly after `todayYmd` by `days` (calendar arithmetic). */
export function addDaysToYmd(todayYmd, days) {
  return format(addDays(parseISO(todayYmd), days), "yyyy-MM-dd");
}

/**
 * Absolute instant for wall-clock start in the business timezone.
 * @param {string} bookingDateYmd
 * @param {string} startHHMM "HH:MM"
 * @param {string} timeZone IANA
 */
export function zonedStartToUtcDate(bookingDateYmd, startHHMM, timeZone) {
  const base = String(startHHMM).slice(0, 5);
  const localStr = `${bookingDateYmd} ${base}:00`;
  return fromZonedTime(localStr, timeZone);
}

/**
 * Local calendar helpers for manager UI (aligns booking_date YYYY-MM-DD with the user's timezone).
 * Do not use toISOString().slice(0, 10) for "today" — that is UTC and can exclude today's bookings.
 */

/**
 * Normalize Postgres `booking_date` / JSON values to `YYYY-MM-DD`.
 * Supabase may return a bare date or an ISO datetime string; strict `===` with calendar columns fails otherwise.
 */
export function normalizeBookingDate(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday 00:00–Sunday end: inclusive date strings for the week containing `ref`. */
export function getWeekRangeMondayToSundayStrings(ref = new Date()) {
  const day = ref.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: localDateString(monday),
    end: localDateString(sunday)
  };
}

/**
 * Week shown on Calendar / Analytics: the current Mon–Sun week if any loaded booking falls in it;
 * otherwise the Mon–Sun week that contains the latest booking date.
 * This matches the Bookings list (all rows) with a single-week grid: a booking next week or last week
 * would otherwise never appear when only "this week" was used.
 */
export function getDisplayWeekRangeForBookings(bookings, ref = new Date()) {
  const current = getWeekRangeMondayToSundayStrings(ref);
  const dates = (bookings || [])
    .map((b) => normalizeBookingDate(b.date))
    .filter(Boolean);
  if (dates.length === 0) return current;

  const inCurrent = dates.some((d) => d >= current.start && d <= current.end);
  if (inCurrent) return current;

  const latest = dates.reduce((a, b) => (a > b ? a : b));
  const [y, m, d] = latest.split("-").map(Number);
  return getWeekRangeMondayToSundayStrings(new Date(y, m - 1, d));
}

/** Seven day columns Mon→Sun for an inclusive Monday–Sunday range string `startStr`. */
export function getDayColumnsForWeekStart(startStr) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [y, m, d] = startStr.split("-").map((x) => parseInt(x, 10));
  const monday = new Date(y, m - 1, d);
  return labels.map((label, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return { label, dateStr: localDateString(dt) };
  });
}

export function bookingsInClosedDateRange(bookings, startStr, endStr) {
  return bookings.filter((b) => {
    const d = normalizeBookingDate(b.date);
    return d >= startStr && d <= endStr;
  });
}

/** Count bookings per weekday Mon→Sun for dates in [startStr, endStr]. */
export function countByWeekdayMonSun(bookings, startStr, endStr) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const b of bookings) {
    const nd = normalizeBookingDate(b.date);
    if (!nd || nd < startStr || nd > endStr) continue;
    const parts = nd.split("-").map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) continue;
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    const idx = (dt.getDay() + 6) % 7;
    counts[idx]++;
  }
  return labels.map((label, i) => ({ label, value: counts[i] }));
}

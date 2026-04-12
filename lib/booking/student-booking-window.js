import { addDaysToYmd, calendarDateInTimeZone } from "@/lib/booking/zoned";
import { resolvePortalBookingWindow } from "@/lib/booking/portal-booking-window";
import { TEACHER_SETTINGS_DEFAULTS } from "@/lib/teacher/teacher-settings-defaults";

function sliceYmd(s) {
  return String(s || "").slice(0, 10);
}

function ymdMax(a, b) {
  const x = sliceYmd(a);
  const y = sliceYmd(b);
  return x >= y ? x : y;
}

function ymdMin(a, b) {
  const x = sliceYmd(a);
  const y = sliceYmd(b);
  return x <= y ? x : y;
}

/**
 * Booking calendar range for the student portal: intersect school portal window with the
 * assigned teacher's `booking_window_days` (merged defaults when no row exists).
 *
 * @param {object} business — `businesses` row
 * @param {import("@/lib/teacher/teacher-settings-defaults").TEACHER_SETTINGS_DEFAULTS} teacherSettingsMerged
 */
export function resolveStudentPortalBookingWindow(business, teacherSettingsMerged, now = new Date()) {
  const tz = String(business?.timezone || "UTC");
  const bizWindow = resolvePortalBookingWindow(business, now);
  const rawDays = Number(teacherSettingsMerged?.booking_window_days);
  const days = Math.max(
    1,
    Math.min(365, Number.isFinite(rawDays) ? rawDays : TEACHER_SETTINGS_DEFAULTS.booking_window_days)
  );
  const today = calendarDateInTimeZone(tz, now);
  const teacherEnd = addDaysToYmd(today, days - 1);
  const start = ymdMax(bizWindow.start, today);
  const end = ymdMin(bizWindow.end, teacherEnd);
  const valid = start <= end;
  // If school window (e.g. next-week-only) does not overlap the teacher's rolling window, still cap by the teacher — never expand back to the full school range.
  if (!valid) {
    return {
      mode: bizWindow.mode,
      start: today,
      end: teacherEnd,
      timeZone: tz,
      scope: "student_teacher",
      teacherBookingWindowDays: days,
      _validIntersect: false
    };
  }
  return {
    mode: bizWindow.mode,
    start,
    end,
    timeZone: tz,
    scope: "student_teacher",
    teacherBookingWindowDays: days,
    _validIntersect: true
  };
}

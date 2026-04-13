/**
 * Canonical defaults for `teacher_settings` (must match migration defaults + validation).
 * Used when no DB row exists and for Reset to defaults.
 */
export const TEACHER_SETTINGS_DEFAULTS = {
  instant_booking_enabled: true,
  max_bookings_per_student_per_day: 1,
  max_bookings_per_student_per_week: 2,
  minimum_hours_before_booking: 12,
  booking_window_days: 14,
  allow_multiple_future_bookings: true,
  default_lesson_duration_minutes: 60,
  break_between_lessons_minutes: 0,
  weekly_recurring_availability_enabled: true,
  auto_generate_slots_enabled: false,
  same_day_booking_enabled: true,
  only_assigned_students_can_book: true,
  only_active_students_can_book: true,
  students_can_reschedule_their_own_bookings: true,
  students_can_cancel_their_own_bookings: true,
  minimum_hours_before_cancellation: 24,
  minimum_hours_before_reschedule: 24,
  notify_on_new_booking: true,
  notify_on_booking_cancellation: true,
  reminder_before_lesson_minutes: 30
};

/**
 * School-level defaults for teacher policy fields that are already present
 * in business settings. Other teacher settings keep canonical defaults.
 * @param {object | null | undefined} business
 */
export function teacherSettingsDefaultsFromBusiness(business) {
  const d = { ...TEACHER_SETTINGS_DEFAULTS };
  if (!business || typeof business !== "object") return d;

  if (typeof business.auto_confirm_bookings === "boolean") {
    d.instant_booking_enabled = Boolean(business.auto_confirm_bookings);
  }
  if (business.max_future_booking_days_enabled) {
    d.booking_window_days = intInRange(business.max_future_booking_days, 1, 365, d.booking_window_days);
  }
  if (business.min_notice_hours_enabled) {
    d.minimum_hours_before_booking = numInRange(business.min_notice_hours, 0, 168, d.minimum_hours_before_booking);
  }
  if (business.max_bookings_per_day_enabled) {
    d.max_bookings_per_student_per_day = intInRange(business.max_bookings_per_day, 1, 50, d.max_bookings_per_student_per_day);
  }
  if (business.max_bookings_per_week_enabled !== false) {
    d.max_bookings_per_student_per_week = intInRange(
      business.max_bookings_per_week,
      1,
      100,
      d.max_bookings_per_student_per_week
    );
  }

  return d;
}

/** @returns {typeof TEACHER_SETTINGS_DEFAULTS} */
export function mergeTeacherSettingsRow(row, defaults = TEACHER_SETTINGS_DEFAULTS) {
  const d = defaults;
  if (!row || typeof row !== "object") return { ...d };
  return {
    instant_booking_enabled: bool(row.instant_booking_enabled, d.instant_booking_enabled),
    max_bookings_per_student_per_day: intInRange(row.max_bookings_per_student_per_day, 1, 50, d.max_bookings_per_student_per_day),
    max_bookings_per_student_per_week: intInRange(row.max_bookings_per_student_per_week, 1, 100, d.max_bookings_per_student_per_week),
    minimum_hours_before_booking: numInRange(row.minimum_hours_before_booking, 0, 168, d.minimum_hours_before_booking),
    booking_window_days: intInRange(row.booking_window_days, 1, 365, d.booking_window_days),
    allow_multiple_future_bookings: bool(row.allow_multiple_future_bookings, d.allow_multiple_future_bookings),
    default_lesson_duration_minutes: durationOption(row.default_lesson_duration_minutes, d.default_lesson_duration_minutes),
    break_between_lessons_minutes: breakOption(row.break_between_lessons_minutes, d.break_between_lessons_minutes),
    weekly_recurring_availability_enabled: bool(row.weekly_recurring_availability_enabled, d.weekly_recurring_availability_enabled),
    auto_generate_slots_enabled: bool(row.auto_generate_slots_enabled, d.auto_generate_slots_enabled),
    same_day_booking_enabled: bool(row.same_day_booking_enabled, d.same_day_booking_enabled),
    only_assigned_students_can_book: bool(row.only_assigned_students_can_book, d.only_assigned_students_can_book),
    only_active_students_can_book: bool(row.only_active_students_can_book, d.only_active_students_can_book),
    students_can_reschedule_their_own_bookings: bool(
      row.students_can_reschedule_their_own_bookings,
      d.students_can_reschedule_their_own_bookings
    ),
    students_can_cancel_their_own_bookings: bool(row.students_can_cancel_their_own_bookings, d.students_can_cancel_their_own_bookings),
    minimum_hours_before_cancellation: numInRange(row.minimum_hours_before_cancellation, 0, 168, d.minimum_hours_before_cancellation),
    minimum_hours_before_reschedule: numInRange(row.minimum_hours_before_reschedule, 0, 168, d.minimum_hours_before_reschedule),
    notify_on_new_booking: bool(row.notify_on_new_booking, d.notify_on_new_booking),
    notify_on_booking_cancellation: bool(row.notify_on_booking_cancellation, d.notify_on_booking_cancellation),
    reminder_before_lesson_minutes: reminderOption(row.reminder_before_lesson_minutes, d.reminder_before_lesson_minutes)
  };
}

function bool(v, fallback) {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  return fallback;
}

function intInRange(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function numInRange(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

function durationOption(v, fallback) {
  const allowed = [45, 60, 90, 120];
  const n = Number(v);
  return allowed.includes(n) ? n : fallback;
}

function breakOption(v, fallback) {
  const allowed = [0, 10, 15, 30];
  const n = Number(v);
  return allowed.includes(n) ? n : fallback;
}

function reminderOption(v, fallback) {
  const allowed = [15, 30, 60];
  const n = Number(v);
  return allowed.includes(n) ? n : fallback;
}

/**
 * Payload for Supabase `upsert` on `teacher_settings` (conflict on business_id + teacher_user_id).
 * @param {string} businessId
 * @param {string} teacherUserId
 * @param {ReturnType<typeof mergeTeacherSettingsRow>} merged
 */
export function teacherSettingsToUpsertRow(businessId, teacherUserId, merged) {
  return {
    business_id: businessId,
    teacher_user_id: teacherUserId,
    ...merged
  };
}

/**
 * Coerce partial API body (camelCase) to storable fields; invalid keys ignored.
 * @returns {Partial<typeof TEACHER_SETTINGS_DEFAULTS>}
 */
export function coerceTeacherSettingsPatch(body, currentMerged) {
  const base = currentMerged || TEACHER_SETTINGS_DEFAULTS;
  const out = {};
  const keys = Object.keys(TEACHER_SETTINGS_DEFAULTS);
  for (const k of keys) {
    if (body[k] === undefined) continue;
    const v = body[k];
    const d = TEACHER_SETTINGS_DEFAULTS[k];
    if (typeof d === "boolean") {
      out[k] = bool(v, base[k]);
    } else if (k === "default_lesson_duration_minutes") {
      out[k] = durationOption(v, base[k]);
    } else if (k === "break_between_lessons_minutes") {
      out[k] = breakOption(v, base[k]);
    } else if (k === "reminder_before_lesson_minutes") {
      out[k] = reminderOption(v, base[k]);
    } else if (k === "max_bookings_per_student_per_day") {
      out[k] = intInRange(v, 1, 50, base[k]);
    } else if (k === "max_bookings_per_student_per_week") {
      out[k] = intInRange(v, 1, 100, base[k]);
    } else if (k === "booking_window_days") {
      out[k] = intInRange(v, 1, 365, base[k]);
    } else if (k === "minimum_hours_before_booking" || k === "minimum_hours_before_cancellation" || k === "minimum_hours_before_reschedule") {
      out[k] = numInRange(v, 0, 168, base[k]);
    }
  }
  return out;
}

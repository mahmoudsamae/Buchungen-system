/**
 * Role presets + optional JSON overrides per teacher.
 * Missing DB row → treat as `standard` (all capabilities on — backward compatible).
 */

export const TEACHER_PERMISSION_KEYS = [
  "can_create_students",
  "can_edit_students",
  "can_deactivate_students",
  "can_create_manual_booking",
  "can_reschedule_booking",
  "can_cancel_booking",
  "can_complete_booking",
  "can_restore_cancelled_booking",
  "can_manage_own_settings",
  "can_write_internal_notes",
  "can_view_analytics",
  "can_manage_own_availability",
  "can_manage_booking_preferences"
];

/** @type {Record<string, Record<string, boolean>>} */
export const TEACHER_ROLE_PRESETS = {
  standard: {
    can_create_students: true,
    can_edit_students: true,
    can_deactivate_students: true,
    can_create_manual_booking: true,
    can_reschedule_booking: true,
    can_cancel_booking: true,
    can_complete_booking: true,
    can_restore_cancelled_booking: true,
    can_manage_own_settings: true,
    can_write_internal_notes: true,
    can_view_analytics: true,
    can_manage_own_availability: true,
    can_manage_booking_preferences: true
  },
  restricted: {
    can_create_students: false,
    can_edit_students: true,
    can_deactivate_students: false,
    can_create_manual_booking: true,
    can_reschedule_booking: true,
    can_cancel_booking: true,
    can_complete_booking: true,
    can_restore_cancelled_booking: false,
    can_manage_own_settings: false,
    can_write_internal_notes: true,
    can_view_analytics: false,
    can_manage_own_availability: true,
    can_manage_booking_preferences: false
  },
  senior: {
    can_create_students: true,
    can_edit_students: true,
    can_deactivate_students: true,
    can_create_manual_booking: true,
    can_reschedule_booking: true,
    can_cancel_booking: true,
    can_complete_booking: true,
    can_restore_cancelled_booking: true,
    can_manage_own_settings: true,
    can_write_internal_notes: true,
    can_view_analytics: true,
    can_manage_own_availability: true,
    can_manage_booking_preferences: true
  }
};

/**
 * @param {{ role_preset?: string | null, permission_overrides?: object | null } | null} ext
 * @returns {Record<string, boolean>}
 */
export function resolveTeacherPermissions(ext) {
  const presetName = ext?.role_preset && TEACHER_ROLE_PRESETS[ext.role_preset] ? ext.role_preset : "standard";
  const base = { ...TEACHER_ROLE_PRESETS[presetName] };
  const over = ext?.permission_overrides && typeof ext.permission_overrides === "object" ? ext.permission_overrides : {};
  // Backward compatibility for legacy/plural key naming.
  if (
    !Object.prototype.hasOwnProperty.call(over, "can_restore_cancelled_booking") &&
    Object.prototype.hasOwnProperty.call(over, "can_restore_cancelled_bookings")
  ) {
    base.can_restore_cancelled_booking = Boolean(over.can_restore_cancelled_bookings);
  }
  for (const k of TEACHER_PERMISSION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(over, k)) {
      base[k] = Boolean(over[k]);
    }
  }
  return base;
}

/**
 * @param {Record<string, boolean>} perms
 * @param {string} key
 */
export function teacherPermissionAllowed(perms, key) {
  if (!perms || typeof perms !== "object") return true;
  if (perms[key] === false) return false;
  return true;
}

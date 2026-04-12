import { mergeTeacherSettingsRow, TEACHER_SETTINGS_DEFAULTS } from "@/lib/teacher/teacher-settings-defaults";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} businessId
 * @param {string} teacherUserId
 * @param {{ readTeacherRowWithServiceRole?: boolean }} [options] — use service role so assigned students can load their instructor's row (RLS otherwise hides it from customer JWTs).
 * @returns {Promise<{ settings: ReturnType<typeof mergeTeacherSettingsRow>, row: object | null }>}
 */
export async function fetchTeacherSettingsMerged(supabase, businessId, teacherUserId, options = {}) {
  const { readTeacherRowWithServiceRole = false } = options;

  let row = null;
  let error = null;

  if (readTeacherRowWithServiceRole) {
    try {
      const admin = createAdminClient();
      const r = await admin
        .from("teacher_settings")
        .select("*")
        .eq("business_id", businessId)
        .eq("teacher_user_id", teacherUserId)
        .maybeSingle();
      row = r.data;
      error = r.error;
    } catch {
      const r = await supabase
        .from("teacher_settings")
        .select("*")
        .eq("business_id", businessId)
        .eq("teacher_user_id", teacherUserId)
        .maybeSingle();
      row = r.data;
      error = r.error;
    }
  } else {
    const r = await supabase
      .from("teacher_settings")
      .select("*")
      .eq("business_id", businessId)
      .eq("teacher_user_id", teacherUserId)
      .maybeSingle();
    row = r.data;
    error = r.error;
  }

  if (error && error.code !== "42P01") {
    console.error("[fetchTeacherSettingsMerged]", error.message);
  }

  let merged = mergeTeacherSettingsRow(row || null);

  if (!row) {
    const { data: staff } = await supabase
      .from("business_users")
      .select("student_booking_mode")
      .eq("business_id", businessId)
      .eq("user_id", teacherUserId)
      .eq("role", "staff")
      .maybeSingle();
    if (staff?.student_booking_mode === "approval_required") {
      merged = { ...merged, instant_booking_enabled: false };
    }
  }

  return { settings: merged, row: row || null };
}

/**
 * Portal booking: whether student bookings confirm immediately (vs pending approval).
 * Prefers `teacher_settings`; if no row, falls back to `business_users.student_booking_mode`.
 * @returns {Promise<boolean>}
 */
export async function getPortalInstantBookingPreference(supabase, businessId, primaryInstructorUserId) {
  if (!primaryInstructorUserId) return true;

  const { data: row, error } = await supabase
    .from("teacher_settings")
    .select("instant_booking_enabled")
    .eq("business_id", businessId)
    .eq("teacher_user_id", primaryInstructorUserId)
    .maybeSingle();

  if (error && error.code !== "42P01") {
    return true;
  }

  if (row && typeof row.instant_booking_enabled === "boolean") {
    return row.instant_booking_enabled;
  }

  const { data: staff } = await supabase
    .from("business_users")
    .select("student_booking_mode")
    .eq("business_id", businessId)
    .eq("user_id", primaryInstructorUserId)
    .eq("role", "staff")
    .maybeSingle();

  return staff?.student_booking_mode !== "approval_required";
}

export { TEACHER_SETTINGS_DEFAULTS, mergeTeacherSettingsRow };

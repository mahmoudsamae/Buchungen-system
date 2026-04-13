import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTeacherPermissions, teacherPermissionAllowed } from "@/lib/manager/teacher-permissions";

/**
 * @param {string} businessId
 * @param {string} teacherUserId
 * @returns {Promise<Record<string, boolean>>}
 */
export async function loadTeacherEffectivePermissions(businessId, teacherUserId) {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return resolveTeacherPermissions(null);
  }
  const { data: ext } = await admin
    .from("teacher_staff_extensions")
    .select("role_preset, permission_overrides")
    .eq("business_id", businessId)
    .eq("teacher_user_id", teacherUserId)
    .maybeSingle();

  return resolveTeacherPermissions(ext || null);
}

/**
 * @param {string} businessId
 * @param {string} teacherUserId
 * @param {string} key
 * @returns {Promise<{ ok: boolean, status?: number, message?: string }>}
 */
export async function assertTeacherCapability(businessId, teacherUserId, key) {
  const perms = await loadTeacherEffectivePermissions(businessId, teacherUserId);
  if (!teacherPermissionAllowed(perms, key)) {
    return {
      ok: false,
      status: 403,
      message: "Your school has not enabled this action for your account."
    };
  }
  return { ok: true };
}

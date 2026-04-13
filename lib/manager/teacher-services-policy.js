/**
 * When a teacher has ≥1 active teacher_services row, only those services are eligible.
 * When they have none, returns `unrestricted` (empty assignment set) — portal student booking
 * may still show the full catalog; teacher-only APIs (GET /api/teacher/services, teacher manual booking)
 * treat that as “no services assigned” and require explicit links.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} businessId
 * @param {string} teacherUserId
 * @returns {Promise<{ mode: 'unrestricted' } | { mode: 'restricted', serviceIds: Set<string> }>}
 */
export async function getTeacherServiceRestriction(supabase, businessId, teacherUserId) {
  const { data, error } = await supabase
    .from("teacher_services")
    .select("service_id")
    .eq("business_id", businessId)
    .eq("teacher_id", teacherUserId)
    .eq("is_active", true);

  if (error) {
    return { mode: "unrestricted" };
  }
  const rows = data || [];
  if (rows.length === 0) {
    return { mode: "unrestricted" };
  }
  return {
    mode: "restricted",
    serviceIds: new Set(rows.map((r) => String(r.service_id)))
  };
}

/**
 * @returns {boolean} true if service is allowed for this teacher (or restriction is off)
 */
export function teacherMayUseService(restriction, serviceId) {
  if (!serviceId) return true;
  if (restriction.mode === "unrestricted") return true;
  return restriction.serviceIds.has(String(serviceId));
}

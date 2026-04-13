import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Replace active teacher↔service links for one staff member.
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} businessId
 * @param {string} teacherUserId
 * @param {string[]} serviceIds
 */
export async function replaceTeacherServiceAssignments(admin, businessId, teacherUserId, serviceIds) {
  const ids = Array.isArray(serviceIds) ? [...new Set(serviceIds.map((id) => String(id).trim()).filter(Boolean))] : [];

  const { error: delErr } = await admin
    .from("teacher_services")
    .delete()
    .eq("business_id", businessId)
    .eq("teacher_id", teacherUserId);

  if (delErr) {
    throw new Error(delErr.message);
  }

  if (!ids.length) return;

  const { data: svcs, error: sErr } = await admin.from("services").select("id").eq("business_id", businessId).in("id", ids);
  if (sErr) throw new Error(sErr.message);
  const ok = new Set((svcs || []).map((s) => String(s.id)));
  const filtered = ids.filter((id) => ok.has(id));
  if (!filtered.length) return;

  const rows = filtered.map((service_id) => ({
    business_id: businessId,
    teacher_id: teacherUserId,
    service_id,
    is_active: true
  }));

  const { error: insErr } = await admin.from("teacher_services").insert(rows);
  if (insErr) throw new Error(insErr.message);
}

/**
 * @param {string} businessId
 * @param {string} teacherUserId
 */
export async function replaceTeacherServiceAssignmentsAdmin(businessId, teacherUserId, serviceIds) {
  const admin = createAdminClient();
  await replaceTeacherServiceAssignments(admin, businessId, teacherUserId, serviceIds);
}

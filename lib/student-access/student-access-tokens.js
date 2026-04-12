import { randomBytes } from "crypto";

function generateToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin — service role
 * @param {{ businessId: string, teacherUserId: string, studentUserId: string }} args
 * @returns {Promise<string>} opaque token for `/student-access/[token]`
 */
export async function ensureStudentAccessToken(admin, { businessId, teacherUserId, studentUserId }) {
  const { data: row, error: selErr } = await admin
    .from("student_access_tokens")
    .select("token, teacher_user_id, revoked_at")
    .eq("business_id", businessId)
    .eq("student_user_id", studentUserId)
    .maybeSingle();

  if (selErr && selErr.code !== "PGRST116") {
    console.error("[ensureStudentAccessToken]", selErr.message);
  }

  if (row?.token && !row.revoked_at && row.teacher_user_id === teacherUserId) {
    return row.token;
  }

  const token = generateToken();
  const { error } = await admin.from("student_access_tokens").upsert(
    {
      business_id: businessId,
      teacher_user_id: teacherUserId,
      student_user_id: studentUserId,
      token,
      revoked_at: null
    },
    { onConflict: "business_id,student_user_id" }
  );

  if (error) {
    console.error("[ensureStudentAccessToken] upsert", error.message);
    throw error;
  }

  return token;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} token
 * @returns {Promise<null | { businessId: string, teacherUserId: string, studentUserId: string }>}
 */
export async function resolveStudentAccessToken(admin, token) {
  const raw = String(token || "").trim();
  if (!raw) return null;

  const { data, error } = await admin
    .from("student_access_tokens")
    .select("business_id, teacher_user_id, student_user_id, revoked_at")
    .eq("token", raw)
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;
  return {
    businessId: data.business_id,
    teacherUserId: data.teacher_user_id,
    studentUserId: data.student_user_id
  };
}

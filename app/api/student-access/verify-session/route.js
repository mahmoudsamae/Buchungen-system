import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveStudentAccessToken } from "@/lib/student-access/student-access-tokens";

/**
 * After Supabase password login from `/login/student-access`, confirms the session matches
 * the student + instructor encoded in the access token.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = String(body.token || "").trim();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const resolved = await resolveStudentAccessToken(admin, token);
  if (!resolved) return NextResponse.json({ error: "Invalid or expired access link." }, { status: 400 });

  if (resolved.studentUserId !== user.id) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This access link is for a different student account. Sign in with the correct email." },
      { status: 403 }
    );
  }

  const { data: biz } = await admin.from("businesses").select("id, slug").eq("id", resolved.businessId).maybeSingle();
  if (!biz) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const { data: mem } = await admin
    .from("business_users")
    .select("id, primary_instructor_user_id, status")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .maybeSingle();

  if (!mem || mem.status !== "active") {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Your student account is not active for this school." }, { status: 403 });
  }

  if (String(mem.primary_instructor_user_id || "") !== String(resolved.teacherUserId)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Your instructor assignment does not match this link. Ask your school for a new access link." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, slug: biz.slug });
}

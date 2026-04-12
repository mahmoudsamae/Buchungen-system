import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertTeacherOwnsStudent } from "@/lib/data/teacher-workspace";
import { normalizeStudentIdParam } from "@/lib/manager/student-route-params";

/** Send Supabase password recovery email to the student (requires SMTP in Supabase). */
export async function POST(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;
  const idNorm = normalizeStudentIdParam((await params).studentId);
  if (!idNorm.ok) return NextResponse.json({ error: idNorm.error }, { status: 400 });
  const studentId = idNorm.studentId;

  const admin = createAdminClient();
  const ok = await assertTeacherOwnsStudent(admin, business.id, user.id, studentId);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("email").eq("id", studentId).maybeSingle();
  if (!profile?.email) {
    return NextResponse.json({ error: "No email on file for this student." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: profile.email
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    message: "Recovery email sent when email is configured."
  });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveStudentAccessToken } from "@/lib/student-access/student-access-tokens";

/** Public metadata for landing page (no auth). Token is the secret. */
export async function GET(request, { params }) {
  const token = String((await params).token || "").trim();
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const resolved = await resolveStudentAccessToken(admin, token);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: biz }, { data: tprof }] = await Promise.all([
    admin.from("businesses").select("slug, name").eq("id", resolved.businessId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", resolved.teacherUserId).maybeSingle()
  ]);

  return NextResponse.json({
    ok: true,
    schoolSlug: biz?.slug || "",
    schoolName: String(biz?.name || "").trim() || "Driving school",
    teacherName: String(tprof?.full_name || "").trim() || "Your instructor"
  });
}

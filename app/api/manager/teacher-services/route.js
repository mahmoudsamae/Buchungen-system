import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { replaceTeacherServiceAssignments } from "@/lib/manager/teacher-service-assignments";

/**
 * GET — all active assignments for the school, grouped by teacher.
 * Optional: ?teacherId=uuid → { serviceIds: string[] } for that teacher only.
 */
export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business } = g.ctx;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server misconfigured." }, { status: 500 });
  }

  const teacherId = String(request.nextUrl.searchParams.get("teacherId") || "").trim();

  const { data: rows, error } = await admin
    .from("teacher_services")
    .select("teacher_id, service_id")
    .eq("business_id", business.id)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (teacherId) {
    const ids = (rows || []).filter((r) => String(r.teacher_id) === teacherId).map((r) => String(r.service_id));
    return NextResponse.json({ teacherId, serviceIds: ids });
  }

  const byTeacher = new Map();
  for (const r of rows || []) {
    const tid = String(r.teacher_id);
    if (!byTeacher.has(tid)) byTeacher.set(tid, []);
    byTeacher.get(tid).push(String(r.service_id));
  }
  const assignments = [...byTeacher.entries()].map(([teacherId, serviceIds]) => ({
    teacherId,
    serviceIds
  }));

  return NextResponse.json({ assignments });
}

/**
 * PUT — replace active assignments for one teacher (staff). Body: { teacherId, serviceIds: string[] }
 */
export async function PUT(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business } = g.ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const teacherId = String(body.teacherId || body.teacher_id || "").trim();
  const serviceIds = Array.isArray(body.serviceIds) ? body.serviceIds.map((id) => String(id).trim()).filter(Boolean) : [];

  if (!teacherId) {
    return NextResponse.json({ error: "teacherId is required." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server misconfigured." }, { status: 500 });
  }

  const { data: mem, error: memErr } = await admin
    .from("business_users")
    .select("id, role")
    .eq("business_id", business.id)
    .eq("user_id", teacherId)
    .maybeSingle();

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });
  if (!mem || mem.role !== "staff") {
    return NextResponse.json({ error: "Teacher must be an active staff member of this school." }, { status: 403 });
  }

  try {
    await replaceTeacherServiceAssignments(admin, business.id, teacherId, serviceIds);
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not update assignments." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, teacherId, serviceIds });
}

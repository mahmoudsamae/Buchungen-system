import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { fetchTeacherSettingsMerged } from "@/lib/data/teacher-settings";
import { mergeTeacherSettingsRow, teacherSettingsToUpsertRow } from "@/lib/teacher/teacher-settings-defaults";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let studentBookingMode = "direct";
  const { data: staffRow, error: staffErr } = await supabase
    .from("business_users")
    .select("student_booking_mode")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .eq("role", "staff")
    .maybeSingle();
  if (!staffErr && staffRow?.student_booking_mode === "approval_required") {
    studentBookingMode = "approval_required";
  }

  return NextResponse.json({ profile: profile || {}, studentBookingMode });
}

export async function PATCH(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const p = {};
  if (body.fullName != null) p.full_name = String(body.fullName);
  if (body.phone != null) p.phone = String(body.phone);
  if (Object.keys(p).length) {
    const { error } = await admin.from("profiles").update(p).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (body.email != null) {
    const email = String(body.email).trim().toLowerCase();
    const { error: ue } = await admin.auth.admin.updateUserById(user.id, { email });
    if (ue) return NextResponse.json({ error: ue.message }, { status: 400 });
    await admin.from("profiles").update({ email }).eq("id", user.id);
  }

  if (body.studentBookingMode === "direct" || body.studentBookingMode === "approval_required") {
    const { error: buErr } = await supabase
      .from("business_users")
      .update({ student_booking_mode: body.studentBookingMode })
      .eq("business_id", business.id)
      .eq("user_id", user.id)
      .eq("role", "staff");
    if (buErr) return NextResponse.json({ error: buErr.message }, { status: 400 });

    const { settings: merged } = await fetchTeacherSettingsMerged(supabase, business.id, user.id, { businessRow: business });
    const withInstant = {
      ...merged,
      instant_booking_enabled: body.studentBookingMode === "direct"
    };
    const row = teacherSettingsToUpsertRow(business.id, user.id, mergeTeacherSettingsRow(withInstant));
    const { error: tsErr } = await supabase.from("teacher_settings").upsert(row, {
      onConflict: "business_id,teacher_user_id"
    });
    if (tsErr) return NextResponse.json({ error: tsErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

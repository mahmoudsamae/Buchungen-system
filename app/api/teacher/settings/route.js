import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { fetchTeacherSettingsMerged } from "@/lib/data/teacher-settings";
import {
  TEACHER_SETTINGS_DEFAULTS,
  coerceTeacherSettingsPatch,
  mergeTeacherSettingsRow,
  teacherSettingsToUpsertRow
} from "@/lib/teacher/teacher-settings-defaults";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  const { settings, row } = await fetchTeacherSettingsMerged(supabase, business.id, user.id);
  return NextResponse.json({
    settings,
    hasPersistedRow: Boolean(row)
  });
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

  const { settings: currentMerged } = await fetchTeacherSettingsMerged(supabase, business.id, user.id);

  let nextMerged;
  if (body.reset === true) {
    nextMerged = mergeTeacherSettingsRow(TEACHER_SETTINGS_DEFAULTS);
  } else {
    const patch = coerceTeacherSettingsPatch(body, currentMerged);
    nextMerged = mergeTeacherSettingsRow({ ...currentMerged, ...patch });
  }

  const row = teacherSettingsToUpsertRow(business.id, user.id, nextMerged);

  const { error } = await supabase.from("teacher_settings").upsert(row, {
    onConflict: "business_id,teacher_user_id"
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const mode = nextMerged.instant_booking_enabled ? "direct" : "approval_required";
  const { error: buErr } = await supabase
    .from("business_users")
    .update({ student_booking_mode: mode })
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .eq("role", "staff");
  if (buErr) {
    return NextResponse.json({ error: buErr.message }, { status: 400 });
  }

  const { settings } = await fetchTeacherSettingsMerged(supabase, business.id, user.id);
  return NextResponse.json({ ok: true, settings, hasPersistedRow: true });
}

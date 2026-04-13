import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { loadTeacherEffectivePermissions } from "@/lib/auth/teacher-capabilities";
import { fetchTeacherSettingsMerged } from "@/lib/data/teacher-settings";
import {
  coerceTeacherSettingsPatch,
  mergeTeacherSettingsRow,
  teacherSettingsToUpsertRow
} from "@/lib/teacher/teacher-settings-defaults";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  const { settings, row } = await fetchTeacherSettingsMerged(supabase, business.id, user.id, { businessRow: business });
  const perms = await loadTeacherEffectivePermissions(business.id, user.id);
  return NextResponse.json({
    settings,
    hasPersistedRow: Boolean(row),
    inheritedFromSchool: !row,
    canManageBookingPreferences: perms.can_manage_booking_preferences !== false,
    canManageOwnSettings: perms.can_manage_own_settings !== false
  });
}

export async function PATCH(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  const perms = await loadTeacherEffectivePermissions(business.id, user.id);
  const canManageOwnSettings = perms.can_manage_own_settings !== false;
  const canManageBookingPreferences = perms.can_manage_booking_preferences !== false;
  if (!canManageOwnSettings || !canManageBookingPreferences) {
    return NextResponse.json({ error: "Your school has not enabled this action for your account." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { settings: currentMerged } = await fetchTeacherSettingsMerged(supabase, business.id, user.id, { businessRow: business });

  let nextMerged = currentMerged;
  if (body.reset === true) {
    const { error: delErr } = await supabase
      .from("teacher_settings")
      .delete()
      .eq("business_id", business.id)
      .eq("teacher_user_id", user.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });
    const r = await fetchTeacherSettingsMerged(supabase, business.id, user.id, { businessRow: business });
    nextMerged = r.settings;
  } else {
    const patch = coerceTeacherSettingsPatch(body, currentMerged);
    nextMerged = mergeTeacherSettingsRow({ ...currentMerged, ...patch });
    const row = teacherSettingsToUpsertRow(business.id, user.id, nextMerged);
    const { error } = await supabase.from("teacher_settings").upsert(row, {
      onConflict: "business_id,teacher_user_id"
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
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

  const { settings, row } = await fetchTeacherSettingsMerged(supabase, business.id, user.id, { businessRow: business });
  return NextResponse.json({ ok: true, settings, hasPersistedRow: Boolean(row), inheritedFromSchool: !row });
}

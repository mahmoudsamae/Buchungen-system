import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSchoolTeacherDetail } from "@/lib/data/school-dashboard-insights";
import { replaceTeacherServiceAssignments } from "@/lib/manager/teacher-service-assignments";
import { TEACHER_ROLE_PRESETS } from "@/lib/manager/teacher-permissions";
import {
  mergeTeacherSettingsRow,
  coerceTeacherSettingsPatch,
  teacherSettingsToUpsertRow,
  teacherSettingsDefaultsFromBusiness
} from "@/lib/teacher/teacher-settings-defaults";

export async function GET(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { userId } = await params;
  try {
    const detail = await getSchoolTeacherDetail(g.ctx.business.id, userId);
    if (!detail) {
      return NextResponse.json({ error: "Teacher not found in this school." }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (e) {
    console.error("[teachers/detail]", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

/**
 * Update staff teacher: profile fields, extension (title / preset / permission overrides),
 * booking policy (teacher_settings), service assignments.
 */
export async function PATCH(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business } = g.ctx;
  const { userId } = await params;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server misconfigured." }, { status: 500 });
  }

  const { data: mem } = await admin
    .from("business_users")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!mem || mem.role !== "staff") {
    return NextResponse.json({ error: "Only staff teachers can be updated on this endpoint." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.fullName != null || body.phone != null || body.email != null) {
    const p = {};
    if (body.fullName != null) p.full_name = String(body.fullName);
    if (body.phone != null) p.phone = String(body.phone);
    if (Object.keys(p).length) {
      const { error } = await admin.from("profiles").update(p).eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (body.email != null) {
      const email = String(body.email).trim().toLowerCase();
      const { error: ue } = await admin.auth.admin.updateUserById(userId, { email });
      if (ue) return NextResponse.json({ error: ue.message }, { status: 400 });
      await admin.from("profiles").update({ email }).eq("id", userId);
    }
  }

  if (body.status && ["active", "inactive", "suspended"].includes(body.status)) {
    const { error } = await admin
      .from("business_users")
      .update({ status: body.status })
      .eq("business_id", business.id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const wantsExtension =
    body.title !== undefined ||
    body.rolePreset !== undefined ||
    body.role_preset !== undefined ||
    body.permissionOverrides !== undefined ||
    body.permission_overrides !== undefined;

  if (wantsExtension) {
    const { data: existing } = await admin
      .from("teacher_staff_extensions")
      .select("*")
      .eq("business_id", business.id)
      .eq("teacher_user_id", userId)
      .maybeSingle();

    const row = {
      business_id: business.id,
      teacher_user_id: userId,
      title: existing?.title ?? null,
      role_preset: existing?.role_preset ?? "standard",
      permission_overrides: existing?.permission_overrides && typeof existing.permission_overrides === "object" ? existing.permission_overrides : {}
    };

    if (body.title !== undefined) {
      row.title = body.title === null || body.title === "" ? null : String(body.title).trim();
    }
    const rp = body.rolePreset ?? body.role_preset;
    if (rp !== undefined) {
      if (!TEACHER_ROLE_PRESETS[rp]) {
        return NextResponse.json({ error: "Invalid role preset." }, { status: 400 });
      }
      row.role_preset = rp;
    }
    const po = body.permissionOverrides ?? body.permission_overrides;
    if (po !== undefined) {
      if (po !== null && typeof po !== "object") {
        return NextResponse.json({ error: "permissionOverrides must be a JSON object." }, { status: 400 });
      }
      row.permission_overrides = po || {};
    }

    const { error: extErr } = await admin.from("teacher_staff_extensions").upsert(row, {
      onConflict: "business_id,teacher_user_id"
    });
    if (extErr) return NextResponse.json({ error: extErr.message }, { status: 400 });
  }

  if (body.bookingPolicy && typeof body.bookingPolicy === "object") {
    const { data: tsRow } = await admin
      .from("teacher_settings")
      .select("*")
      .eq("business_id", business.id)
      .eq("teacher_user_id", userId)
      .maybeSingle();
    const currentMerged = mergeTeacherSettingsRow(tsRow || null, teacherSettingsDefaultsFromBusiness(business));
    const partial = coerceTeacherSettingsPatch(body.bookingPolicy, currentMerged);
    const nextMerged = mergeTeacherSettingsRow({ ...currentMerged, ...partial });
    const upsert = teacherSettingsToUpsertRow(business.id, userId, nextMerged);
    const { error: tsErr } = await admin.from("teacher_settings").upsert(upsert, {
      onConflict: "business_id,teacher_user_id"
    });
    if (tsErr) return NextResponse.json({ error: tsErr.message }, { status: 400 });

    const mode = nextMerged.instant_booking_enabled ? "direct" : "approval_required";
    await admin
      .from("business_users")
      .update({ student_booking_mode: mode })
      .eq("business_id", business.id)
      .eq("user_id", userId)
      .eq("role", "staff");
  }

  if (Array.isArray(body.serviceIds)) {
    try {
      await replaceTeacherServiceAssignments(admin, business.id, userId, body.serviceIds);
    } catch (e) {
      return NextResponse.json({ error: e.message || "Could not update service assignments." }, { status: 400 });
    }
  }

  try {
    const detail = await getSchoolTeacherDetail(business.id, userId);
    return NextResponse.json({ ok: true, teacher: detail });
  } catch (e) {
    return NextResponse.json({ ok: true, warning: e.message });
  }
}

import { NextResponse } from "next/server";
import { resolveStudentPortalBookingWindow } from "@/lib/booking/student-booking-window";
import { fetchTeacherSettingsMerged } from "@/lib/data/teacher-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeTeacherSettingsRow, TEACHER_SETTINGS_DEFAULTS } from "@/lib/teacher/teacher-settings-defaults";
import { createClient } from "@/lib/supabase/server";

/** Student portal: policies + **teacher-scoped** booking window and metadata. */
export async function GET(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { data: biz, error: be } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  if (be || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: mem } = await supabase
    .from("business_users")
    .select("id, primary_instructor_user_id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pid = mem.primary_instructor_user_id || null;
  const { settings: teacherSettings } = pid
    ? await fetchTeacherSettingsMerged(supabase, biz.id, pid, { readTeacherRowWithServiceRole: true })
    : { settings: mergeTeacherSettingsRow(null) };

  const bookingWindow = resolveStudentPortalBookingWindow(biz, teacherSettings);

  const teacherAllowsReschedule = teacherSettings.students_can_reschedule_their_own_bookings !== false;
  const teacherAllowsCancel = teacherSettings.students_can_cancel_their_own_bookings !== false;

  const bizAllowsReschedule = biz.allow_customer_reschedule !== false;
  const bizAllowsCancel = biz.allow_customer_cancellations !== false;

  let teacherName = "";
  if (pid) {
    try {
      const admin = createAdminClient();
      const { data: insProf } = await admin.from("profiles").select("full_name").eq("id", pid).maybeSingle();
      teacherName = String(insProf?.full_name || "").trim();
    } catch {
      const { data: insProf } = await supabase.from("profiles").select("full_name").eq("id", pid).maybeSingle();
      teacherName = String(insProf?.full_name || "").trim();
    }
  }

  const bookingMode = teacherSettings.instant_booking_enabled ? "direct" : "approval_required";

  return NextResponse.json({
    school: { name: biz.name || "", slug: biz.slug },
    teacher: pid
      ? {
          id: pid,
          fullName: teacherName || "Your instructor",
          bookingMode,
          settings: {
            booking_window_days: teacherSettings.booking_window_days ?? TEACHER_SETTINGS_DEFAULTS.booking_window_days
          }
        }
      : null,
    no_primary_instructor: !pid,
    booking_policy: biz.booking_policy || "",
    cancellation_policy: biz.cancellation_policy || "",
    show_booking_policy_at_checkout: biz.show_booking_policy_at_checkout !== false,
    show_cancellation_policy_at_checkout: biz.show_cancellation_policy_at_checkout !== false,
    late_cancellation_notice_text: biz.late_cancellation_notice_text || "",
    allow_customer_reschedule: bizAllowsReschedule && teacherAllowsReschedule,
    allow_customer_cancellations: bizAllowsCancel && teacherAllowsCancel,
    booking_window: bookingWindow
  });
}

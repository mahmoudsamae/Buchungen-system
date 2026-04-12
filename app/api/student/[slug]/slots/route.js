import { NextResponse } from "next/server";
import { calendarDateInTimeZone } from "@/lib/booking/zoned";
import { expirePastPendingBookings } from "@/lib/booking/booking-lifecycle";
import { isDateInsidePortalBookingWindow } from "@/lib/booking/portal-booking-window";
import { resolveStudentPortalBookingWindow } from "@/lib/booking/student-booking-window";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchTeacherSettingsMerged } from "@/lib/data/teacher-settings";
import { getAvailableSlotsForDate } from "@/lib/booking/slot-availability-query";
export async function GET(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const dateStr = request.nextUrl.searchParams.get("date");
  if (!dateStr) return NextResponse.json({ error: "date query required (YYYY-MM-DD)" }, { status: 400 });

  const { data: biz, error: be } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  if (be || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  await expirePastPendingBookings(supabase, { businessId: biz.id, timeZone: biz.timezone || "UTC" });

  const { data: mem } = await supabase
    .from("business_users")
    .select("id, category_id, primary_instructor_user_id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const primaryInstructorUserId = mem.primary_instructor_user_id || null;
  if (!primaryInstructorUserId) {
    return NextResponse.json(
      {
        error: "No driving instructor is assigned to your account yet. Please contact your school.",
        code: "NO_INSTRUCTOR_ASSIGNED"
      },
      { status: 403 }
    );
  }

  const { settings: teacherSettings } = await fetchTeacherSettingsMerged(supabase, biz.id, primaryInstructorUserId, {
    readTeacherRowWithServiceRole: true
  });
  const studentWindow = resolveStudentPortalBookingWindow(biz, teacherSettings);

  if (!isDateInsidePortalBookingWindow(dateStr, studentWindow)) {
    return NextResponse.json(
      {
        error: "Selected date is outside your booking window.",
        booking_window: studentWindow
      },
      { status: 400 }
    );
  }

  const duration =
    Number(teacherSettings.default_lesson_duration_minutes) ||
    Number(biz.slot_duration_minutes) ||
    60;
  const businessForSlots = { ...biz, slot_duration_minutes: duration };

  /** Service role avoids RLS gaps when reading instructor availability + business bookings for this school. */
  let slotDb = supabase;
  try {
    slotDb = createAdminClient();
  } catch {
    slotDb = supabase;
  }

  const { slots, rawSlots, reason: computedReason, resolved } = await getAvailableSlotsForDate({
    supabase: slotDb,
    business: businessForSlots,
    date: dateStr,
    categoryId: mem.category_id || null,
    primaryInstructorUserId
  });

  const slotDurationMinutes = duration;
  const tz = biz.timezone || "UTC";
  const todayBiz = calendarDateInTimeZone(tz);

  let slots_empty_reason = null;
  if (slots.length === 0) {
    if (dateStr < todayBiz) slots_empty_reason = "date_in_past";
    else if (computedReason === "closed") slots_empty_reason = "closed";
    else if (!rawSlots.length) slots_empty_reason = "no_windows";
    else if (dateStr === todayBiz) slots_empty_reason = "all_times_passed_today";
    else slots_empty_reason = "no_windows";
  }

  const remainingOpenSlots = Boolean(biz.show_remaining_slots_to_customers) ? slots.length : null;

  return NextResponse.json({
    business: {
      name: biz.name,
      slug: biz.slug,
      slot_duration_minutes: slotDurationMinutes,
      timezone: tz
    },
    teacher_scoped: true,
    primary_instructor_user_id: primaryInstructorUserId,
    date: dateStr,
    slots,
    slots_empty_reason,
    remaining_open_slots: remainingOpenSlots,
    booking_window: studentWindow,
    resolved_mode: resolved?.mode || null
  });
}

import { NextResponse } from "next/server";
import { calendarDateInTimeZone } from "@/lib/booking/zoned";
import { expirePastPendingBookings } from "@/lib/booking/booking-lifecycle";
import { isDateInsidePortalBookingWindow, resolvePortalBookingWindow } from "@/lib/booking/portal-booking-window";
import { createClient } from "@/lib/supabase/server";
import { getAvailableSlotsForDate } from "@/lib/booking/slot-availability-query";
import { weekdayFromCalendarDateString } from "@/lib/booking/final-availability";

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
  const portalWindow = resolvePortalBookingWindow(biz);
  if (!isDateInsidePortalBookingWindow(dateStr, portalWindow)) {
    return NextResponse.json(
      {
        error:
          portalWindow.mode === "next_week_only"
            ? `Booking is currently limited to next week (${portalWindow.start} to ${portalWindow.end}).`
            : "Selected date is outside the current booking window.",
        booking_window: portalWindow
      },
      { status: 400 }
    );
  }

  const { data: mem } = await supabase
    .from("business_users")
    .select("id, category_id, primary_instructor_user_id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const customerCategoryId = mem.category_id || null;

  const { slots, rawSlots, reason: computedReason, resolved } = await getAvailableSlotsForDate({
    supabase,
    business: biz,
    date: dateStr,
    categoryId: customerCategoryId,
    primaryInstructorUserId: mem.primary_instructor_user_id || null
  });
  const slotDurationMinutes = biz.slot_duration_minutes || 30;
  const tz = biz.timezone || "UTC";
  const todayBiz = calendarDateInTimeZone(tz);
  const weekday = weekdayFromCalendarDateString(dateStr);
  const bufferMin = biz.buffer_between_bookings_enabled ? Number(biz.buffer_between_bookings_minutes) || 0 : 0;

  let slots_empty_reason = null;
  if (slots.length === 0) {
    if (dateStr < todayBiz) slots_empty_reason = "date_in_past";
    else if (computedReason === "closed") slots_empty_reason = "closed";
    else if (!rawSlots.length) slots_empty_reason = "no_windows";
    else if (dateStr === todayBiz) slots_empty_reason = "all_times_passed_today";
    else slots_empty_reason = "no_windows";
  }

  const debugSlots =
    process.env.NODE_ENV === "development" || process.env.DEBUG_PORTAL_SLOTS === "1";
  if (debugSlots) {
    console.log(
      "[portal/slots]",
      JSON.stringify({
        business_id: biz.id,
        slug,
        date: dateStr,
        weekday,
        slot_duration_minutes: slotDurationMinutes,
        buffer_minutes: bufferMin,
        response_slot_count: slots.length,
        raw_slot_count: rawSlots.length,
        business_today: todayBiz
      })
    );
  }

  const remainingOpenSlots = Boolean(biz.show_remaining_slots_to_customers) ? slots.length : null;

  return NextResponse.json({
    business: { name: biz.name, slug: biz.slug, slot_duration_minutes: slotDurationMinutes, timezone: tz },
    date: dateStr,
    slots,
    slots_empty_reason,
    remaining_open_slots: remainingOpenSlots,
    booking_window: portalWindow
  });
}

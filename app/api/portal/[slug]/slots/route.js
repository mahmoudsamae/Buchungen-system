import { NextResponse } from "next/server";
import { computeSlotsForDate, expandBookedRangesForBuffer } from "@/lib/booking/slots";
import { createClient } from "@/lib/supabase/server";

/** Weekday 0–6 for a calendar date string, stable across timezones (noon UTC avoids DST edge cases). */
function weekdayFromCalendarDateString(dateStr) {
  const parts = dateStr.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

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

  const { data: mem } = await supabase
    .from("business_users")
    .select("id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("business_id", biz.id)
    .order("weekday")
    .order("start_time");

  const { data: booked } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("business_id", biz.id)
    .eq("booking_date", dateStr)
    .neq("status", "cancelled");

  const mappedRules = (rules || []).map((r) => ({
    weekday: Number(r.weekday),
    start_time: String(r.start_time).slice(0, 5),
    end_time: String(r.end_time).slice(0, 5),
    is_active: Boolean(r.is_active)
  }));

  const baseRanges = (booked || []).map((b) => ({
    start_time: String(b.start_time).slice(0, 5),
    end_time: String(b.end_time).slice(0, 5)
  }));

  const bufferMin = biz.buffer_between_bookings_enabled ? Number(biz.buffer_between_bookings_minutes) || 0 : 0;
  const bookedRanges = expandBookedRangesForBuffer(baseRanges, bufferMin);

  const slotDurationMinutes = biz.slot_duration_minutes || 30;
  const weekday = weekdayFromCalendarDateString(dateStr);

  const slots = computeSlotsForDate({
    weekday,
    rules: mappedRules,
    slotDurationMinutes,
    bookedRanges
  });

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
        response_slot_count: slots.length
      })
    );
  }

  const remainingOpenSlots = Boolean(biz.show_remaining_slots_to_customers) ? slots.length : null;

  return NextResponse.json({
    business: { name: biz.name, slug: biz.slug, slot_duration_minutes: slotDurationMinutes },
    date: dateStr,
    slots,
    remaining_open_slots: remainingOpenSlots
  });
}

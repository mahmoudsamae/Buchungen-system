import { calendarDateInTimeZone } from "@/lib/booking/zoned";
import { filterSlotsToFutureWallClock } from "@/lib/booking/slot-wall-clock";
import { computeSlotsForDate, expandBookedRangesForBuffer } from "@/lib/booking/slots";
import { weekdayFromCalendarDateString } from "@/lib/booking/final-availability";
import { resolveBookingAvailabilityWindows } from "@/lib/booking/booking-availability-resolve";

export async function getAvailableSlotsForDate({
  supabase,
  business,
  date,
  categoryId = null,
  excludeBookingId,
  primaryInstructorUserId = null
}) {
  const resolved = await resolveBookingAvailabilityWindows({
    supabase,
    businessId: business.id,
    date,
    categoryId,
    primaryInstructorUserId
  });

  if (resolved.mode === "closed") {
    return { slots: [], rawSlots: [], reason: "closed", resolved };
  }

  const weekday = weekdayFromCalendarDateString(date);
  const mappedRules = (resolved.windows || []).map((w) => ({
    weekday,
    start_time: String(w.start_time).slice(0, 5),
    end_time: String(w.end_time).slice(0, 5),
    is_active: true
  }));

  const { data: booked } = await supabase
    .from("bookings")
    .select("id, start_time, end_time")
    .eq("business_id", business.id)
    .eq("booking_date", date)
    .in("status", ["pending", "confirmed"]);

  const baseRanges = (booked || [])
    .filter((b) => String(b.id) !== String(excludeBookingId || ""))
    .map((b) => ({
      start_time: String(b.start_time).slice(0, 5),
      end_time: String(b.end_time).slice(0, 5)
    }));

  const bufferMin = business.buffer_between_bookings_enabled
    ? Number(business.buffer_between_bookings_minutes) || 0
    : 0;
  const bookedRanges = expandBookedRangesForBuffer(baseRanges, bufferMin);

  const rawSlots = computeSlotsForDate({
    weekday,
    rules: mappedRules,
    slotDurationMinutes: business.slot_duration_minutes || 30,
    bookedRanges
  });
  const slots = filterSlotsToFutureWallClock(rawSlots, date, business.timezone || "UTC");

  const todayBiz = calendarDateInTimeZone(business.timezone || "UTC");
  let reason = null;
  if (slots.length === 0) {
    if (date < todayBiz) reason = "date_in_past";
    else if (!rawSlots.length) reason = "no_windows";
    else if (date === todayBiz) reason = "all_times_passed_today";
    else reason = "no_windows";
  }

  return { slots, rawSlots, reason, resolved };
}


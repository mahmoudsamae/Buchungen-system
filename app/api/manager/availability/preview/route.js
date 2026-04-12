import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { computeSlotsForDate, expandBookedRangesForBuffer } from "@/lib/booking/slots";
import { filterSlotsToFutureWallClock } from "@/lib/booking/slot-wall-clock";
import { resolveAvailabilityWindowsForDate, weekdayFromCalendarDateString } from "@/lib/booking/final-availability";
import { normalizeCategoryId } from "@/lib/manager/category-utils";

function normalizeDate(d) {
  const s = String(d || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return s;
}

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const date = normalizeDate(request.nextUrl.searchParams.get("date"));
  if (!date) return NextResponse.json({ error: "date query required (YYYY-MM-DD)" }, { status: 400 });

  const rawCategoryParam = request.nextUrl.searchParams.get("categoryId");
  // IMPORTANT: categoryId === undefined means "All categories" (no filter).
  // categoryId === null means global scope only (used for uncategorized customers).
  const categoryId = rawCategoryParam == null ? undefined : normalizeCategoryId(rawCategoryParam);

  const resolved = await resolveAvailabilityWindowsForDate({
    supabase,
    businessId: business.id,
    date,
    categoryId
  });

  if (resolved.mode === "closed") {
    return NextResponse.json({ date, source: resolved.source, windows: [], slots: [] });
  }

  const mappedRules = resolved.windows.map((w) => ({
    weekday: weekdayFromCalendarDateString(date),
    start_time: w.start_time,
    end_time: w.end_time,
    is_active: true
  }));

  const { data: booked, error: be } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("business_id", business.id)
    .eq("booking_date", date)
    .in("status", ["pending", "confirmed"]);
  if (be) console.error("[manager/availability/preview bookings]", be.code || "", be.message);

  const baseRanges = (booked || []).map((b) => ({
    start_time: String(b.start_time).slice(0, 5),
    end_time: String(b.end_time).slice(0, 5)
  }));

  const bufferMin = business.buffer_between_bookings_enabled
    ? Number(business.buffer_between_bookings_minutes) || 0
    : 0;
  const bookedRanges = expandBookedRangesForBuffer(baseRanges, bufferMin);

  const slotDurationMinutes = business.slot_duration_minutes || 30;
  const weekday = weekdayFromCalendarDateString(date);

  const rawSlots = computeSlotsForDate({
    weekday,
    rules: mappedRules,
    slotDurationMinutes,
    bookedRanges
  });

  const tz = business.timezone || "UTC";
  const slots = filterSlotsToFutureWallClock(rawSlots, date, tz);

  return NextResponse.json({
    date,
    source: resolved.source,
    windows: resolved.windows,
    slots,
    remaining_open_slots: slots.length
  });
}


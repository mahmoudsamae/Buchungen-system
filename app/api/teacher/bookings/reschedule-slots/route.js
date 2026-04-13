import { NextResponse } from "next/server";
import { addDaysToYmd, calendarDateInTimeZone } from "@/lib/booking/zoned";
import { guardStaffJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertTeacherOwnsStudent } from "@/lib/data/teacher-workspace";
import { getAvailableSlotsForDate } from "@/lib/booking/slot-availability-query";

function normalizeDate(d) {
  const s = String(d || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Slots for teacher reschedule or new manual booking: same availability pipeline as booking.
 * Query:
 * - customerUserId (required)
 * - excludeBookingId (optional — omit for new bookings; required when excluding the row being moved)
 * - date=YYYY-MM-DD → { slots, reason, date }
 * - next=N (default 8) without date → { nextSlots: [{ date, start, end }, ...] }
 * - browseDates=1 → { dates: [...] } for days with ≥1 slot within horizonDays (default 21)
 */
export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;

  const customerUserId = String(request.nextUrl.searchParams.get("customerUserId") || "").trim();
  const excludeBookingIdRaw = String(request.nextUrl.searchParams.get("excludeBookingId") || "").trim();
  const excludeBookingId = excludeBookingIdRaw || undefined;
  const dateParam = normalizeDate(request.nextUrl.searchParams.get("date"));
  const browseDates = request.nextUrl.searchParams.get("browseDates") === "1";
  const nextLimitRaw = Number(request.nextUrl.searchParams.get("next") || "");
  const nextLimit = Number.isFinite(nextLimitRaw) ? Math.min(24, Math.max(1, Math.trunc(nextLimitRaw))) : 0;
  const horizonDaysRaw = Number(request.nextUrl.searchParams.get("horizonDays") || 21);
  /** Cap high so teachers can browse "Neue Buchung" dates beyond the student portal booking window. */
  const horizonDays = Number.isFinite(horizonDaysRaw) ? Math.max(1, Math.min(366, Math.trunc(horizonDaysRaw))) : 21;

  if (!customerUserId) {
    return NextResponse.json({ error: "customerUserId is required." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const own = await assertTeacherOwnsStudent(admin, business.id, user.id, customerUserId);
  if (!own) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: mem } = await admin
    .from("business_users")
    .select("category_id, primary_instructor_user_id")
    .eq("business_id", business.id)
    .eq("user_id", customerUserId)
    .eq("role", "customer")
    .maybeSingle();
  if (!mem) {
    return NextResponse.json({ error: "Student not found for this school." }, { status: 400 });
  }
  if (String(mem.primary_instructor_user_id || "") !== String(user.id)) {
    return NextResponse.json({ error: "This student is not assigned to you." }, { status: 403 });
  }

  const tz = business.timezone || "UTC";
  const categoryId = mem.category_id || null;
  const primaryInstructorUserId = user.id;

  const slotParams = {
    supabase: admin,
    business,
    categoryId,
    excludeBookingId: excludeBookingId || null,
    primaryInstructorUserId
  };

  if (dateParam) {
    const { slots, reason } = await getAvailableSlotsForDate({
      ...slotParams,
      date: dateParam
    });
    const normalized = (slots || []).map((s) => ({
      start: String(s.start).slice(0, 5),
      end: String(s.end).slice(0, 5)
    }));
    return NextResponse.json({
      date: dateParam,
      slots: normalized,
      reason,
      businessTimeZone: tz
    });
  }

  if (browseDates) {
    const startDate = calendarDateInTimeZone(tz);
    const dates = [];
    for (let i = 0; i < horizonDays; i += 1) {
      const d = addDaysToYmd(startDate, i);
      const { slots } = await getAvailableSlotsForDate({ ...slotParams, date: d });
      if (slots.length) dates.push(d);
    }
    return NextResponse.json({ dates, fromDate: startDate, horizonDays, businessTimeZone: tz });
  }

  const limit = nextLimit || 8;
  const startDate = calendarDateInTimeZone(tz);
  const nextSlots = [];
  for (let i = 0; i < horizonDays && nextSlots.length < limit; i += 1) {
    const d = addDaysToYmd(startDate, i);
    const { slots } = await getAvailableSlotsForDate({ ...slotParams, date: d });
    for (const s of slots || []) {
      if (nextSlots.length >= limit) break;
      nextSlots.push({
        date: d,
        start: String(s.start).slice(0, 5),
        end: String(s.end).slice(0, 5)
      });
    }
  }

  return NextResponse.json({ nextSlots, businessTimeZone: tz });
}

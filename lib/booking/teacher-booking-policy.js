import { parseISO } from "date-fns";
import { addDaysToYmd, calendarDateInTimeZone, weekYmdRangeInTimeZone, zonedStartToUtcDate } from "@/lib/booking/zoned";
import { fetchTeacherSettingsMerged } from "@/lib/data/teacher-settings";

const ACTIVE = ["pending", "confirmed"];

function bookingsBaseQuery(supabase, businessId, customerUserId, excludeBookingId) {
  let q = supabase.from("bookings").select("id, booking_date").eq("business_id", businessId).eq("customer_user_id", customerUserId);
  if (excludeBookingId) {
    q = q.neq("id", excludeBookingId);
  }
  return q;
}

/**
 * Enforce per-teacher policy for a customer booking (portal / student flow).
 * Call after business-level rules when `primaryInstructorUserId` is set.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   business: { id: string, timezone?: string | null },
 *   customerUserId: string,
 *   bookingDateYmd: string,
 *   startHHMM: string,
 *   primaryInstructorUserId: string | null,
 *   membership: { status?: string | null, primary_instructor_user_id?: string | null } | null,
 *   excludeBookingId?: string | null,
 *   skipInstructorBookingWindowDays?: boolean
 * }} args
 */
export async function validateTeacherBookingPolicy(supabase, args) {
  const {
    business,
    customerUserId,
    bookingDateYmd,
    startHHMM,
    primaryInstructorUserId,
    membership,
    excludeBookingId,
    skipInstructorBookingWindowDays
  } = args;

  if (!primaryInstructorUserId) {
    return { ok: true };
  }

  const { settings: s } = await fetchTeacherSettingsMerged(supabase, business.id, primaryInstructorUserId, {
    businessRow: business
  });
  const tz = String(business.timezone || "UTC");
  const dateStr = String(bookingDateYmd).slice(0, 10);
  const start = String(startHHMM).slice(0, 5);
  const today = calendarDateInTimeZone(tz);

  const mem = membership || {};
  if (s.only_active_students_can_book && mem.status && mem.status !== "active") {
    return { ok: false, message: "Only active students can book with this instructor." };
  }
  if (s.only_assigned_students_can_book && mem.primary_instructor_user_id && mem.primary_instructor_user_id !== primaryInstructorUserId) {
    return { ok: false, message: "You can only book lessons with your assigned instructor." };
  }

  if (!s.same_day_booking_enabled && dateStr === today) {
    return { ok: false, message: "Same-day booking is disabled by your instructor." };
  }

  const startUtc = zonedStartToUtcDate(dateStr, start, tz);
  const msNeeded = Number(s.minimum_hours_before_booking) * 3600 * 1000;
  if (startUtc.getTime() - Date.now() < msNeeded) {
    return {
      ok: false,
      message: `Please choose a time at least ${s.minimum_hours_before_booking} hour(s) from now (instructor policy).`
    };
  }

  if (!skipInstructorBookingWindowDays) {
    const lastAllowed = addDaysToYmd(today, s.booking_window_days);
    if (dateStr > lastAllowed) {
      return {
        ok: false,
        message: `Bookings can only be made up to ${s.booking_window_days} days in advance (instructor policy).`
      };
    }
  }

  if (!s.allow_multiple_future_bookings) {
    let fq = bookingsBaseQuery(supabase, business.id, customerUserId, excludeBookingId)
      .in("status", ACTIVE)
      .gte("booking_date", today);
    const { data: futureRows } = await fq;
    if ((futureRows || []).length > 0) {
      return {
        ok: false,
        message: "Your instructor allows only one upcoming booking at a time. Cancel or complete it before booking another."
      };
    }
  }

  let dayQ = bookingsBaseQuery(supabase, business.id, customerUserId, excludeBookingId)
    .eq("booking_date", dateStr)
    .in("status", ACTIVE);
  const { data: dayRows } = await dayQ;

  if ((dayRows || []).length >= s.max_bookings_per_student_per_day) {
    return {
      ok: false,
      message: `You can book at most ${s.max_bookings_per_student_per_day} lesson(s) per day with this instructor.`
    };
  }

  const { start: weekStart, end: weekEnd } = weekYmdRangeInTimeZone(tz, parseISO(`${dateStr}T12:00:00`));
  let weekQ = bookingsBaseQuery(supabase, business.id, customerUserId, excludeBookingId)
    .in("status", ACTIVE)
    .gte("booking_date", weekStart)
    .lte("booking_date", weekEnd);
  const { data: weekRows } = await weekQ;

  if ((weekRows || []).length >= s.max_bookings_per_student_per_week) {
    return {
      ok: false,
      message: `You can book at most ${s.max_bookings_per_student_per_week} lesson(s) per week with this instructor.`
    };
  }

  return { ok: true };
}

/**
 * Portal/student cancellation: instructor policy on top of business rules.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   business: { id: string, timezone?: string | null },
 *   bookingRow: { booking_date: string, start_time: string, status?: string },
 *   primaryInstructorUserId: string | null
 * }} args
 */
export async function validateTeacherCustomerCancellationPolicy(supabase, args) {
  const { business, bookingRow, primaryInstructorUserId } = args;
  if (!primaryInstructorUserId) {
    return { ok: true };
  }

  const { settings: s } = await fetchTeacherSettingsMerged(supabase, business.id, primaryInstructorUserId, {
    businessRow: business
  });
  if (!s.students_can_cancel_their_own_bookings) {
    return {
      ok: false,
      message: "Your instructor does not allow cancelling lessons online. Please contact your school."
    };
  }

  const st = String(bookingRow.status || "");
  if (!["pending", "confirmed"].includes(st)) {
    return { ok: true };
  }

  const tz = String(business.timezone || "UTC");
  const dateStr = String(bookingRow.booking_date).slice(0, 10);
  const time = String(bookingRow.start_time).slice(0, 5);
  const startUtc = zonedStartToUtcDate(dateStr, time, tz);
  const hours = Math.max(0, Number(s.minimum_hours_before_cancellation) || 0);
  if (hours > 0 && startUtc.getTime() - Date.now() < hours * 3600 * 1000) {
    return {
      ok: false,
      message: `Cancellations must be made at least ${hours} hour(s) before the lesson (instructor policy).`
    };
  }

  return { ok: true };
}

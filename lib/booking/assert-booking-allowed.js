import { assertNoBookingBufferViolation } from "@/lib/booking/booking-buffer";
import { validateBookingBusinessRules } from "@/lib/booking/booking-rules-validate";
import { assertBookingWallClockBookable } from "@/lib/booking/slot-wall-clock";
import { validateTeacherBookingPolicy } from "@/lib/booking/teacher-booking-policy";
import { assertNoBookingOverlap } from "@/lib/manager/booking-overlap";
import { computeEndTimeForBooking } from "@/lib/manager/booking-reschedule";
import { resolveBookingAvailabilityWindows } from "@/lib/booking/booking-availability-resolve";

/**
 * Full server-side gate: business rules, calendar overlap, buffer spacing.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function assertBookingAllowed(supabase, params) {
  const {
    business,
    customerUserId,
    bookingDateYmd,
    startHHMM,
    endHHMM: endHHMMOverride,
    excludeBookingId,
    serviceIdOrNull,
    categoryIdOrNull,
    actingUser,
    skipEmailVerification
  } = params;

  const dateStr = String(bookingDateYmd).slice(0, 10);
  const start = String(startHHMM).slice(0, 5);

  const wallClock = assertBookingWallClockBookable({
    bookingDateYmd: dateStr,
    startHHMM: start,
    timeZone: business?.timezone || "UTC"
  });
  if (!wallClock.ok) {
    return { ok: false, status: wallClock.status, message: wallClock.message };
  }

  const explicitEnd = endHHMMOverride != null ? String(endHHMMOverride).slice(0, 5) : "";
  const { endHHMM: computedEnd } = await computeEndTimeForBooking(supabase, business, serviceIdOrNull || null, start);
  const endHHMM = explicitEnd || computedEnd;
  if (!endHHMM) return { ok: false, status: 400, message: "Invalid time or duration." };

  const { data: custMem } = await supabase
    .from("business_users")
    .select("primary_instructor_user_id, status")
    .eq("business_id", business.id)
    .eq("user_id", customerUserId)
    .eq("role", "customer")
    .maybeSingle();

  const primaryInstructorUserId = custMem?.primary_instructor_user_id || null;

  // Availability check: selected [start,end] must match a bookable window for that date.
  // This prevents booking a random start inside a larger block.
  const resolved = await resolveBookingAvailabilityWindows({
    supabase,
    businessId: business.id,
    date: dateStr,
    categoryId: categoryIdOrNull || null,
    primaryInstructorUserId
  });
  if (resolved.mode === "closed" || !(resolved.windows || []).length) {
    return { ok: false, status: 400, message: "This date is closed or has no bookable slots." };
  }
  const windows = resolved.windows || [];
  const matchesWindow = windows.some(
    (w) => String(w.start_time).slice(0, 5) === start && String(w.end_time).slice(0, 5) === endHHMM
  );
  if (!matchesWindow) {
    return { ok: false, status: 400, message: "That time is not available. Please pick an available block." };
  }

  const rules = await validateBookingBusinessRules(supabase, {
    business,
    customerUserId,
    bookingDateYmd: dateStr,
    startHHMM: start,
    endHHMM,
    excludeBookingId,
    actingUser: actingUser || null,
    skipEmailVerification: Boolean(skipEmailVerification)
  });
  if (!rules.ok) return { ok: false, status: 400, message: rules.message, code: rules.code };

  const teacherPolicy = await validateTeacherBookingPolicy(supabase, {
    business,
    customerUserId,
    bookingDateYmd: dateStr,
    startHHMM: start,
    primaryInstructorUserId,
    membership: custMem || null,
    excludeBookingId: excludeBookingId || null
  });
  if (!teacherPolicy.ok) {
    return { ok: false, status: 400, message: teacherPolicy.message };
  }

  const overlap = await assertNoBookingOverlap(supabase, {
    businessId: business.id,
    bookingDate: dateStr,
    startHHMM: start,
    endHHMM,
    excludeBookingId
  });
  if (!overlap.ok) return { ok: false, status: 409, message: overlap.message };

  const buf = business.buffer_between_bookings_enabled ? Number(business.buffer_between_bookings_minutes) || 0 : 0;
  const bufferCheck = await assertNoBookingBufferViolation(supabase, {
    businessId: business.id,
    bookingDate: dateStr,
    startHHMM: start,
    endHHMM,
    excludeBookingId,
    bufferMinutes: buf
  });
  if (!bufferCheck.ok) return { ok: false, status: 409, message: bufferCheck.message };

  return { ok: true, endHHMM };
}

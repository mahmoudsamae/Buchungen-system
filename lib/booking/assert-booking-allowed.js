import { assertNoBookingBufferViolation } from "@/lib/booking/booking-buffer";
import { validateBookingBusinessRules } from "@/lib/booking/booking-rules-validate";
import { assertNoBookingOverlap } from "@/lib/manager/booking-overlap";
import { computeEndTimeForBooking } from "@/lib/manager/booking-reschedule";

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
    excludeBookingId,
    serviceIdOrNull,
    actingUser,
    skipEmailVerification
  } = params;

  const dateStr = String(bookingDateYmd).slice(0, 10);
  const start = String(startHHMM).slice(0, 5);

  const { endHHMM } = await computeEndTimeForBooking(supabase, business, serviceIdOrNull || null, start);
  if (!endHHMM) return { ok: false, status: 400, message: "Invalid time or duration." };

  const rules = await validateBookingBusinessRules(supabase, {
    business,
    customerUserId,
    bookingDateYmd: dateStr,
    startHHMM: start,
    excludeBookingId,
    actingUser: actingUser || null,
    skipEmailVerification: Boolean(skipEmailVerification)
  });
  if (!rules.ok) return { ok: false, status: 400, message: rules.message };

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

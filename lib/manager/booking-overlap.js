import { BOOKING_OVERLAP_STATUSES } from "@/lib/manager/booking-constants";
import { timeToMinutes, timesOverlapHalfOpenMinutes } from "@/lib/manager/booking-time";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ businessId: string, bookingDate: string, startHHMM: string, endHHMM: string, excludeBookingId?: string }} args
 * @returns {Promise<{ id: string, start_time: string, end_time: string, status: string } | null>}
 */
export async function findOverlappingBooking(supabase, args) {
  const { businessId, bookingDate, startHHMM, endHHMM, excludeBookingId } = args;
  const startMin = timeToMinutes(startHHMM);
  const endMin = timeToMinutes(endHHMM);
  if (startMin == null || endMin == null || endMin <= startMin) {
    throw new Error("Invalid booking window.");
  }

  const { data: rows, error } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, status")
    .eq("business_id", businessId)
    .eq("booking_date", bookingDate)
    .in("status", BOOKING_OVERLAP_STATUSES);

  if (error) throw new Error(error.message);

  for (const row of rows || []) {
    if (excludeBookingId && row.id === excludeBookingId) continue;
    const rs = timeToMinutes(row.start_time);
    const re = timeToMinutes(row.end_time);
    if (rs == null || re == null) continue;
    if (timesOverlapHalfOpenMinutes(startMin, endMin, rs, re)) {
      return row;
    }
  }
  return null;
}

/** Normalize overlap args from HH:MM strings (end may be computed). */
export async function assertNoBookingOverlap(supabase, args) {
  try {
    const clash = await findOverlappingBooking(supabase, args);
    if (clash) {
      return {
        ok: false,
        message: "That time overlaps another booking. Pick a different slot."
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message || "Invalid time window." };
  }
}

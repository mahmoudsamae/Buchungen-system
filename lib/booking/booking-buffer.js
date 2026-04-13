import { timeToMinutes } from "@/lib/manager/booking-time";

/**
 * Enforces minimum gap (minutes) between this booking and other pending/confirmed
 * intervals on the same calendar day (same-day clamp; overnight buffers need a future iteration).
 */
export async function assertNoBookingBufferViolation(supabase, args) {
  const { businessId, bookingDate, startHHMM, endHHMM, excludeBookingId, bufferMinutes } = args;
  const buf = Number(bufferMinutes) || 0;
  if (buf <= 0) return { ok: true };

  const { data: rows, error } = await supabase
    .from("bookings")
    .select("id, start_time, end_time")
    .eq("business_id", businessId)
    .eq("booking_date", bookingDate)
    .in("status", ["pending", "confirmed"]);

  if (error) return { ok: false, message: error.message || "Could not verify spacing." };

  const ns = timeToMinutes(startHHMM);
  const ne = timeToMinutes(endHHMM);
  if (ns == null || ne == null || ne <= ns) {
    return { ok: false, message: "Invalid time window." };
  }

  for (const row of rows || []) {
    if (excludeBookingId && String(row.id) === String(excludeBookingId)) continue;
    const es = timeToMinutes(String(row.start_time).slice(0, 5));
    const ee = timeToMinutes(String(row.end_time).slice(0, 5));
    if (es == null || ee == null) continue;
    if (intervalsTooClose(ns, ne, es, ee, buf)) {
      return {
        ok: false,
        message: `Another appointment is too close — keep at least ${buf} minutes between bookings.`
      };
    }
  }
  return { ok: true };
}

function intervalsTooClose(a1, a2, b1, b2, buf) {
  if (a1 < b2 && b1 < a2) return true;
  if (b2 <= a1 && a1 - b2 < buf) return true;
  if (a2 <= b1 && b1 - a2 < buf) return true;
  return false;
}

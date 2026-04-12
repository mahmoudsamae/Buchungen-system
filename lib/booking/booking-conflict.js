/**
 * Detect DB-level unique conflict for active booking block index.
 */
export function isBookingBlockConflict(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "").toLowerCase();
  if (code !== "23505") return false;
  return msg.includes("uq_bookings_active_block") || msg.includes("bookings");
}

export function bookingBlockConflictMessage() {
  return "This slot was just booked by someone else. Please refresh and choose another available time.";
}

export const BOOKING_CONFLICT_CODES = {
  SLOT_ALREADY_BOOKED: "SLOT_ALREADY_BOOKED",
  SLOT_RESERVED_BY_ANOTHER_USER: "SLOT_RESERVED_BY_ANOTHER_USER",
  SLOT_ALREADY_PENDING_FOR_THIS_USER: "SLOT_ALREADY_PENDING_FOR_THIS_USER",
  SLOT_ALREADY_BOOKED_FOR_THIS_USER: "SLOT_ALREADY_BOOKED_FOR_THIS_USER"
};

/** Active-block lookup for exact (business/date/start/end). */
export async function findExistingActiveBookingForBlock(
  supabase,
  { businessId, bookingDateYmd, startHHMM, endHHMM }
) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_user_id, status")
    .eq("business_id", businessId)
    .eq("booking_date", String(bookingDateYmd).slice(0, 10))
    .eq("start_time", `${String(startHHMM).slice(0, 5)}:00`)
    .eq("end_time", `${String(endHHMM).slice(0, 5)}:00`)
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { booking: null, error };
  return { booking: data || null, error: null };
}


import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import { bookingBlockConflictMessage, isBookingBlockConflict } from "@/lib/booking/booking-conflict";
import { BOOKING_NON_RESCHEDULABLE_STATUSES } from "@/lib/manager/booking-constants";
import { normalizeBookingDate } from "@/lib/manager/booking-date-utils";
import { addMinutesToTime, sqlTimeFromHHMM } from "@/lib/manager/booking-time";

function sliceDate(d) {
  const n = normalizeBookingDate(d);
  return n || String(d).slice(0, 10);
}

function normStart(t) {
  return String(t).slice(0, 5);
}

/** Resolve end time (HH:MM label) from service + business defaults. */
export async function computeEndTimeForBooking(supabase, business, serviceIdOrNull, startHHMM) {
  let duration = Number(business.slot_duration_minutes) || 30;
  if (serviceIdOrNull) {
    const { data: svc } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", serviceIdOrNull)
      .eq("business_id", business.id)
      .maybeSingle();
    if (svc?.duration_minutes != null) duration = Number(svc.duration_minutes) || duration;
  }
  const end = addMinutesToTime(startHHMM, duration);
  return { endHHMM: end, duration };
}

/**
 * Writes history + updates booking to new slot.
 * Active row stays operational (pending/confirmed); "rescheduled" is not used as a steady state — see product note in migration.
 *
 * @param {object} opts.extraPatch — merged into update (e.g. service_id, notes, internal_note, customer_user_id). Must not contain booking_date/start_time/end_time/status unless intentional; those are set here.
 */
export async function runReschedule({
  supabase,
  business,
  actorUserId,
  existingRow,
  newBookingDate,
  newStartHHMM,
  extraPatch = {}
}) {
  const prevDate = sliceDate(existingRow.booking_date);
  const prevStart = normStart(existingRow.start_time);
  const prevEnd = normStart(existingRow.end_time);
  const nd = sliceDate(newBookingDate);
  const ns = normStart(newStartHHMM);

  if (BOOKING_NON_RESCHEDULABLE_STATUSES.includes(existingRow.status)) {
    return { ok: false, status: 400, message: "This booking cannot be rescheduled." };
  }

  if (prevDate === nd && prevStart === ns) {
    return { ok: false, status: 400, message: "Choose a different date or time." };
  }

  const effectiveServiceId = extraPatch.service_id ?? existingRow.service_id;

  const allowed = await assertBookingAllowed(supabase, {
    business,
    customerUserId: existingRow.customer_user_id,
    bookingDateYmd: nd,
    startHHMM: ns,
    excludeBookingId: existingRow.id,
    serviceIdOrNull: effectiveServiceId,
    actingUser: null,
    skipEmailVerification: true
  });
  if (!allowed.ok) {
    return { ok: false, status: allowed.status, message: allowed.message, code: allowed.code || null };
  }
  const endHHMM = allowed.endHHMM;

  /** Do not derive from `auto_confirm_bookings` — that applies to new bookings. Keep operational state. */
  let nextStatus;
  if (String(existingRow.status) === "pending") {
    nextStatus = "pending";
  } else if (String(existingRow.status) === "confirmed") {
    nextStatus = "confirmed";
  } else {
    nextStatus = business.auto_confirm_bookings ? "confirmed" : "pending";
  }

  const histPayload = {
    business_id: business.id,
    booking_id: existingRow.id,
    previous_booking_date: prevDate,
    previous_start_time: existingRow.start_time,
    previous_end_time: existingRow.end_time,
    new_booking_date: nd,
    new_start_time: sqlTimeFromHHMM(ns),
    new_end_time: sqlTimeFromHHMM(endHHMM),
    actor_user_id: actorUserId
  };

  const { data: hist, error: hErr } = await supabase
    .from("booking_reschedule_history")
    .insert(histPayload)
    .select("id")
    .single();

  if (hErr) {
    return { ok: false, status: 400, message: hErr.message };
  }

  const updateRow = {
    booking_date: nd,
    start_time: sqlTimeFromHHMM(ns),
    end_time: sqlTimeFromHHMM(endHHMM),
    status: nextStatus
  };
  for (const k of ["service_id", "customer_user_id", "notes", "internal_note"]) {
    if (extraPatch[k] !== undefined) updateRow[k] = extraPatch[k];
  }

  const { data: row, error: uErr } = await supabase
    .from("bookings")
    .update(updateRow)
    .eq("id", existingRow.id)
    .eq("business_id", business.id)
    .select()
    .single();

  if (uErr || !row) {
    await supabase.from("booking_reschedule_history").delete().eq("id", hist.id);
    if (isBookingBlockConflict(uErr)) {
      return { ok: false, status: 409, message: bookingBlockConflictMessage() };
    }
    return { ok: false, status: 400, message: uErr?.message || "Update failed." };
  }

  return { ok: true, booking: row };
}

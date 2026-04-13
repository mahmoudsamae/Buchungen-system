import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { normalizeBookingDate } from "@/lib/manager/booking-date-utils";
import { zonedStartToUtcDate } from "@/lib/booking/zoned";

function bookingStartParts(booking) {
  const date = normalizeBookingDate(booking?.booking_date) || String(booking?.booking_date || "").slice(0, 10);
  const time = String(booking.start_time || "").slice(0, 5);
  return { date, time };
}

/**
 * True when business-local wall clock is at or past the booking end (end_time on booking_date).
 * Used to gate "complete lesson" so teachers cannot complete before the slot has ended.
 */
export function hasBookingEnded(booking, timeZone, now = new Date()) {
  const date = normalizeBookingDate(booking?.booking_date) || String(booking?.booking_date || "").slice(0, 10);
  const endRaw = String(booking?.end_time ?? "").trim();
  if (!date || !endRaw) return false;
  const endHm = endRaw.slice(0, 5);
  const endUtc = zonedStartToUtcDate(date, endHm, timeZone || "UTC");
  if (!(endUtc instanceof Date) || Number.isNaN(endUtc.getTime())) return false;
  return now.getTime() >= endUtc.getTime();
}

function isWithinCompletedCorrectionWindow(booking, timeZone, now = new Date()) {
  const tz = timeZone || "UTC";
  const z = toZonedTime(now, tz);
  const nowDate = format(z, "yyyy-MM-dd");
  const bookingDate = String(booking?.booking_date || "").slice(0, 10);
  // Keep this strict and predictable for managers: same business-local day only.
  return Boolean(bookingDate) && bookingDate === nowDate;
}

const STATUS_CORRECTION_WINDOW_HOURS = 12;

function isWithinPostStartCorrectionHours(booking, timeZone, now = new Date(), hours = STATUS_CORRECTION_WINDOW_HOURS) {
  const date = String(booking?.booking_date || "").slice(0, 10);
  const time = String(booking?.start_time || "").slice(0, 5);
  if (!date || !time) return false;
  const startUtc = zonedStartToUtcDate(date, time, timeZone || "UTC");
  if (!(startUtc instanceof Date) || Number.isNaN(startUtc.getTime())) return false;
  const ms = now.getTime() - startUtc.getTime();
  return ms >= 0 && ms <= hours * 60 * 60 * 1000;
}

export function canRestoreCancelledOrNoShow(booking, timeZone, now = new Date()) {
  return !hasBookingStarted(booking, timeZone, now) || isWithinPostStartCorrectionHours(booking, timeZone, now);
}

export function canRestoreCompleted(booking, timeZone, now = new Date()) {
  return isWithinCompletedCorrectionWindow(booking, timeZone, now);
}

export function hasBookingStarted(booking, timeZone, now = new Date()) {
  const { date, time } = bookingStartParts(booking);
  if (!date || !time) return false;
  const z = toZonedTime(now, timeZone || "UTC");
  const nowDate = format(z, "yyyy-MM-dd");
  const nowTime = format(z, "HH:mm");
  if (date < nowDate) return true;
  if (date > nowDate) return false;
  return time <= nowTime;
}

export function canTransitionBookingStatus({ currentStatus, nextStatus, booking, businessTimeZone }) {
  const current = normalizeBookingStatus(currentStatus) || String(currentStatus || "");
  const next = normalizeBookingStatus(nextStatus) || String(nextStatus || "");
  if (!next || current === next) return { ok: true };

  if (current === "expired" && next !== "expired") {
    return {
      ok: false,
      message:
        "This booking cannot be changed.\nWhy: the booking already expired.\nNext step: create a new booking if the lesson should happen."
    };
  }

  const started = hasBookingStarted(booking, businessTimeZone);
  const isCancelled = current === "cancelled_by_manager" || current === "cancelled_by_user";

  if (current === "rejected" || current === "expired") {
    return {
      ok: false,
      message:
        "This booking cannot be changed.\nWhy: it is already closed in this state.\nNext step: create a new booking if needed."
    };
  }

  // Pending: confirm, reject, or cancel (manager/staff).
  if (current === "pending") {
    if (next === "confirmed" || next === "cancelled_by_manager" || next === "rejected") return { ok: true };
    return {
      ok: false,
      message:
        "This pending booking cannot move to that status.\nWhy: pending can only be confirmed, rejected, or cancelled.\nNext step: confirm it first, then continue after lesson start."
    };
  }

  // Confirmed: before start -> cancel only; from start -> complete/no-show/cancel.
  if (current === "confirmed") {
    const allowed = started ? ["completed", "no_show", "cancelled_by_manager"] : ["cancelled_by_manager"];
    if (allowed.includes(next)) return { ok: true };
    return {
      ok: false,
      message: started
        ? "This confirmed booking cannot be moved to that status now.\nWhy: from lesson start onward, only completed, no-show, or cancelled are allowed.\nNext step: choose one of those outcomes."
        : "This booking cannot be marked as completed or no-show yet.\nWhy: the lesson has not started.\nNext step: keep confirmed, cancel, or reschedule."
    };
  }

  // Cancelled: can be restored if still upcoming or shortly after start.
  if (isCancelled) {
    if (next !== "confirmed") {
      return {
        ok: false,
        message:
          "This cancelled booking cannot move to that status.\nWhy: cancelled bookings can only be restored to confirmed.\nNext step: use 'Restore to confirmed' or reschedule."
      };
    }
    if (!canRestoreCancelledOrNoShow(booking, businessTimeZone)) {
      return {
        ok: false,
        message:
          "This cancelled booking can no longer be restored.\nWhy: the correction window has expired.\nNext step: create a new booking or reschedule another lesson."
      };
    }
    return { ok: true };
  }

  // Completed: limited correction window to confirmed.
  if (current === "completed") {
    if (next !== "confirmed") {
      return {
        ok: false,
        message:
          "This completed booking cannot move to that status.\nWhy: completed can only be reverted to confirmed.\nNext step: choose 'revert to confirmed' if this was a mistake."
      };
    }
    if (!canRestoreCompleted(booking, businessTimeZone)) {
      return {
        ok: false,
        message:
          "This completed booking can no longer be reverted.\nWhy: the correction window has expired.\nNext step: create a new booking if needed."
      };
    }
    return { ok: true };
  }

  // No-show: allow correction to confirmed.
  if (current === "no_show") {
    if (next === "cancelled_by_manager") return { ok: true };
    if (next === "confirmed") {
      if (canRestoreCancelledOrNoShow(booking, businessTimeZone)) return { ok: true };
      return {
        ok: false,
        message:
          "This no-show booking can no longer be restored.\nWhy: the correction window has expired.\nNext step: keep it as no-show or create a new booking."
      };
    }
    return {
      ok: false,
      message:
        "This no-show booking cannot move to that status.\nWhy: no-show can only be restored to confirmed or changed to cancelled.\nNext step: use one of those correction actions."
    };
  }

  return { ok: true };
}

/** Auto-expire pending bookings whose start time has passed in the business timezone. */
export async function expirePastPendingBookings(supabase, { businessId, timeZone }) {
  const tz = timeZone || "UTC";
  const z = toZonedTime(new Date(), tz);
  const today = format(z, "yyyy-MM-dd");
  const nowHms = format(z, "HH:mm:ss");

  const { error } = await supabase
    .from("bookings")
    .update({ status: "expired" })
    .eq("business_id", businessId)
    .eq("status", "pending")
    .or(`booking_date.lt.${today},and(booking_date.eq.${today},start_time.lte.${nowHms})`);
  if (error) console.error("[expirePastPendingBookings]", error.code || "", error.message);
}

export function isNeedsOutcomeBooking(booking, timeZone) {
  return String(booking.status) === "confirmed" && hasBookingStarted(booking, timeZone);
}


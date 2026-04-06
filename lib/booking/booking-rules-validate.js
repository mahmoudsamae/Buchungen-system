import {
  addDaysToYmd,
  calendarDateInTimeZone,
  monthYmdRangeInTimeZone,
  weekYmdRangeInTimeZone,
  zonedStartToUtcDate
} from "@/lib/booking/zoned";

const ACTIVE = ["pending", "confirmed"];

/**
 * Portal / shared validations before a booking is created or moved.
 * Does not check overlap or buffer — use `assertBookingAllowed` for the full chain.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} opts
 * @param {Record<string, unknown>} opts.business — businesses row
 * @param {string} opts.customerUserId
 * @param {string} opts.bookingDateYmd
 * @param {string} opts.startHHMM
 * @param {string} [opts.excludeBookingId]
 * @param {{ id?: string, email_confirmed_at?: string | null } | null} opts.actingUser — portal actor
 * @param {boolean} [opts.skipEmailVerification] — manager creates on behalf of customer
 */
export async function validateBookingBusinessRules(supabase, opts) {
  const {
    business,
    customerUserId,
    bookingDateYmd,
    startHHMM,
    excludeBookingId,
    actingUser,
    skipEmailVerification = false
  } = opts;

  const tz = String(business.timezone || "UTC");
  const dateStr = String(bookingDateYmd).slice(0, 10);
  const start = String(startHHMM).slice(0, 5);
  const today = calendarDateInTimeZone(tz);

  if (dateStr < today) {
    return { ok: false, message: "You cannot book a date in the past." };
  }

  if (!business.allow_same_day_bookings && dateStr === today) {
    return { ok: false, message: "Same-day booking is not available for this business." };
  }

  if (business.max_future_booking_days_enabled) {
    const maxDays = Math.max(1, Number(business.max_future_booking_days) || 30);
    const lastAllowed = addDaysToYmd(today, maxDays);
    if (dateStr > lastAllowed) {
      return {
        ok: false,
        message: `Bookings can only be made up to ${maxDays} days in advance.`
      };
    }
  }

  if (business.min_notice_hours_enabled) {
    const hours = Math.max(0, Number(business.min_notice_hours) || 0);
    const startUtc = zonedStartToUtcDate(dateStr, start, tz);
    const msNeeded = hours * 3600 * 1000;
    if (startUtc.getTime() - Date.now() < msNeeded) {
      return {
        ok: false,
        message:
          hours === 0
            ? "This start time no longer meets the minimum advance notice rule."
            : `Please choose a time at least ${hours} hour(s) from now.`
      };
    }
  }

  if (!skipEmailVerification && business.require_email_verification_to_book) {
    const at = actingUser?.email_confirmed_at;
    if (!at) {
      return {
        ok: false,
        message: "Please verify your email before booking. Check your inbox for the confirmation link."
      };
    }
  }

  if (business.prevent_same_day_multiple_bookings) {
    const { n, err } = await countBookings(
      supabase,
      business.id,
      customerUserId,
      dateStr,
      dateStr,
      excludeBookingId
    );
    if (err) return { ok: false, message: "Could not verify booking limits." };
    if (n > 0) {
      return { ok: false, message: "You already have an appointment on this day." };
    }
  }

  if (business.max_bookings_per_week_enabled) {
    const cap = Math.max(1, Number(business.max_bookings_per_week) || 1);
    const { start: w0, end: w1 } = weekYmdRangeInTimeZone(tz);
    const { n, err } = await countBookings(supabase, business.id, customerUserId, w0, w1, excludeBookingId);
    if (err) return { ok: false, message: "Could not verify booking limits." };
    if (n >= cap) {
      return {
        ok: false,
        message: `You have reached the weekly limit of ${cap} active appointment(s) for this business.`
      };
    }
  }

  if (business.max_bookings_per_month_enabled) {
    const cap = Math.max(1, Number(business.max_bookings_per_month) || 1);
    const { start: m0, end: m1 } = monthYmdRangeInTimeZone(tz);
    const { n, err } = await countBookings(supabase, business.id, customerUserId, m0, m1, excludeBookingId);
    if (err) return { ok: false, message: "Could not verify booking limits." };
    if (n >= cap) {
      return {
        ok: false,
        message: `You have reached the monthly limit of ${cap} active appointment(s) for this business.`
      };
    }
  }

  if (business.block_after_no_shows_enabled) {
    const cap = Math.max(1, Number(business.block_after_no_shows_count) || 1);
    const { count, error } = await noShowCount(supabase, business.id, customerUserId);
    if (error) return { ok: false, message: "Could not verify booking eligibility." };
    if ((count || 0) >= cap) {
      return {
        ok: false,
        message:
          "Online booking is paused for your account after repeated missed appointments. Please contact the business."
      };
    }
  }

  if (business.block_after_cancellations_enabled) {
    const cap = Math.max(1, Number(business.block_after_cancellations_count) || 1);
    const { count, error } = await cancellationCount(supabase, business.id, customerUserId);
    if (error) return { ok: false, message: "Could not verify booking eligibility." };
    if ((count || 0) >= cap) {
      return {
        ok: false,
        message:
          "Online booking is paused for your account after repeated cancellations. Please contact the business."
      };
    }
  }

  return { ok: true };
}

async function countBookings(supabase, businessId, customerUserId, fromYmd, toYmd, excludeBookingId) {
  let q = supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("customer_user_id", customerUserId)
    .in("status", ACTIVE)
    .gte("booking_date", fromYmd)
    .lte("booking_date", toYmd);
  if (excludeBookingId) q = q.neq("id", excludeBookingId);
  const { count, error } = await q;
  if (error) return { n: 0, err: error };
  return { n: count || 0, err: null };
}

async function noShowCount(supabase, businessId, customerUserId) {
  return supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("customer_user_id", customerUserId)
    .eq("status", "no_show");
}

async function cancellationCount(supabase, businessId, customerUserId) {
  return supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("customer_user_id", customerUserId)
    .eq("status", "cancelled");
}

import { zonedStartToUtcDate } from "@/lib/booking/zoned";

/**
 * @param {Record<string, unknown>} business
 * @param {{ booking_date: string, start_time: string, status?: string }} bookingRow
 */
export function validateCustomerCancellation(business, bookingRow) {
  if (business.allow_customer_cancellations === false) {
    return {
      ok: false,
      message: "Online cancellation is turned off for this business. Please contact them directly."
    };
  }

  const st = String(bookingRow.status || "");
  if (!["pending", "confirmed"].includes(st)) {
    return { ok: false, message: "This appointment can no longer be cancelled online." };
  }

  const tz = String(business.timezone || "UTC");
  const dateStr = String(bookingRow.booking_date).slice(0, 10);
  const time = String(bookingRow.start_time).slice(0, 5);
  const startUtc = zonedStartToUtcDate(dateStr, time, tz);

  if (business.cancellation_deadline_hours_enabled) {
    const h = Math.max(0, Number(business.cancellation_deadline_hours) || 0);
    if (startUtc.getTime() - Date.now() < h * 3600 * 1000) {
      return {
        ok: false,
        message:
          h === 0
            ? "This appointment can no longer be cancelled online."
            : `Cancellations must be made at least ${h} hour(s) before the start time.`
      };
    }
  }

  return { ok: true };
}

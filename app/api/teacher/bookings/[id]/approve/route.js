import { NextResponse } from "next/server";
import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import {
  bookingBlockConflictMessage,
  findExistingActiveBookingForBlock,
  isBookingBlockConflict
} from "@/lib/booking/booking-conflict";
import { expirePastPendingBookings } from "@/lib/booking/booking-lifecycle";
import { guardStaffJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertTeacherOwnsStudent } from "@/lib/data/teacher-workspace";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { normalizeBookingDate } from "@/lib/manager/booking-date-utils";

/** Approve a pending student booking after re-validating the slot is still free. */
export async function POST(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  const { id } = await params;

  const admin = createAdminClient();
  await expirePastPendingBookings(supabase, { businessId: business.id, timeZone: business.timezone || "UTC" });

  const { data: row, error: loadErr } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const st = normalizeBookingStatus(row.status) || String(row.status || "");
  if (st !== "pending") {
    return NextResponse.json({ error: "Only pending bookings can be approved." }, { status: 400 });
  }

  const own = await assertTeacherOwnsStudent(admin, business.id, user.id, row.customer_user_id);
  if (!own) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: mem } = await admin
    .from("business_users")
    .select("category_id, primary_instructor_user_id, status")
    .eq("business_id", business.id)
    .eq("user_id", row.customer_user_id)
    .eq("role", "customer")
    .maybeSingle();

  const bookingDateYmd = normalizeBookingDate(row.booking_date);
  const startHHMM = String(row.start_time).slice(0, 5);
  const endHHMM = String(row.end_time || row.start_time).slice(0, 5);

  const allowed = await assertBookingAllowed(supabase, {
    business,
    customerUserId: row.customer_user_id,
    bookingDateYmd,
    startHHMM,
    endHHMM,
    excludeBookingId: row.id,
    serviceIdOrNull: row.service_id || null,
    categoryIdOrNull: mem?.category_id || null,
    actingUser: null,
    skipEmailVerification: true,
    customerBusinessUserRow: mem || undefined
  });

  if (!allowed.ok) {
    return NextResponse.json(
      { error: allowed.message || "This slot is no longer available.", code: "SLOT_UNAVAILABLE" },
      { status: 409 }
    );
  }

  const block = await findExistingActiveBookingForBlock(admin, {
    businessId: business.id,
    bookingDateYmd,
    startHHMM,
    endHHMM: allowed.endHHMM
  });
  if (block.error) return NextResponse.json({ error: block.error.message }, { status: 400 });
  if (block.booking && String(block.booking.id) !== String(row.id)) {
    return NextResponse.json({ error: bookingBlockConflictMessage(), code: "SLOT_TAKEN" }, { status: 409 });
  }

  const { data: updated, error: upErr } = await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("business_id", business.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (upErr) {
    if (isBookingBlockConflict(upErr)) {
      return NextResponse.json({ error: bookingBlockConflictMessage() }, { status: 409 });
    }
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Booking was modified by another request." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, booking: updated });
}

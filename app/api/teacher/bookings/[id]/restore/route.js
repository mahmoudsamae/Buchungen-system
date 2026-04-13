import { NextResponse } from "next/server";
import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import { canTransitionBookingStatus, hasBookingStarted } from "@/lib/booking/booking-lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardStaffJson } from "@/lib/auth/guards";
import { assertTeacherCapability } from "@/lib/auth/teacher-capabilities";
import { assertTeacherOwnsStudent } from "@/lib/data/teacher-workspace";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { normalizeBookingDate } from "@/lib/manager/booking-date-utils";

const CANCELLED = new Set(["cancelled_by_manager", "cancelled_by_user"]);

/**
 * POST — restore an eligible cancelled booking to confirmed (school setting + validation).
 */
export async function POST(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;
  const { id } = await params;

  const cap = await assertTeacherCapability(business.id, user.id, "can_restore_cancelled_booking");
  if (!cap.ok) return NextResponse.json({ error: cap.message }, { status: cap.status });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const { data: row, error: loadErr } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const own = await assertTeacherOwnsStudent(admin, business.id, user.id, row.customer_user_id);
  if (!own) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const st = normalizeBookingStatus(row.status) || String(row.status || "");
  if (!CANCELLED.has(st)) {
    return NextResponse.json({ error: "Only cancelled bookings can be restored." }, { status: 400 });
  }

  const tz = business.timezone || "UTC";
  const bookingForLifecycle = {
    booking_date: row.booking_date,
    start_time: row.start_time,
    end_time: row.end_time
  };
  if (hasBookingStarted(bookingForLifecycle, tz)) {
    return NextResponse.json(
      { error: "This lesson has already started or passed. It cannot be restored." },
      { status: 400 }
    );
  }

  const tx = canTransitionBookingStatus({
    currentStatus: st,
    nextStatus: "confirmed",
    booking: bookingForLifecycle,
    businessTimeZone: tz
  });
  if (!tx.ok) {
    return NextResponse.json({ error: tx.message }, { status: 409 });
  }

  const { data: mem } = await admin
    .from("business_users")
    .select("category_id, primary_instructor_user_id, status")
    .eq("business_id", business.id)
    .eq("user_id", row.customer_user_id)
    .eq("role", "customer")
    .maybeSingle();

  const bookingDateYmd = normalizeBookingDate(row.booking_date) || String(row.booking_date || "").slice(0, 10);
  const startHHMM = String(row.start_time || "").slice(0, 5);
  const endHHMM = String(row.end_time || "").slice(0, 5);

  const allowed = await assertBookingAllowed(admin, {
    business,
    customerUserId: row.customer_user_id,
    bookingDateYmd,
    startHHMM,
    endHHMM: endHHMM || undefined,
    excludeBookingId: row.id,
    serviceIdOrNull: row.service_id || null,
    categoryIdOrNull: mem?.category_id || null,
    actingUser: null,
    skipEmailVerification: true,
    customerBusinessUserRow: mem || null,
    skipInstructorBookingWindowDays: true,
    skipBusinessRules: true,
    skipTeacherPolicy: true
  });
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.message, code: allowed.code || null }, { status: allowed.status });
  }

  const { data: updated, error: upErr } = await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("business_id", business.id)
    .select()
    .maybeSingle();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, booking: updated });
}

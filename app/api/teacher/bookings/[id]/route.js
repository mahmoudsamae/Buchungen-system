import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertTeacherOwnsStudent } from "@/lib/data/teacher-workspace";
import { expirePastPendingBookings, canTransitionBookingStatus } from "@/lib/booking/booking-lifecycle";
import { isBookingStatus } from "@/lib/manager/booking-constants";
import { runReschedule } from "@/lib/manager/booking-reschedule";

function sliceDate(d) {
  return String(d).slice(0, 10);
}

function normStart(t) {
  return String(t).slice(0, 5);
}

export async function PATCH(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  const { id } = await params;

  const admin = createAdminClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const own = await assertTeacherOwnsStudent(admin, business.id, user.id, existing.customer_user_id);
  if (!own) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await expirePastPendingBookings(supabase, { businessId: business.id, timeZone: business.timezone });
  const { data: current } = await admin.from("bookings").select("*").eq("id", id).eq("business_id", business.id).maybeSingle();
  const row = current || existing;

  const nextDateInput = body.booking_date || body.date;
  const nextTimeInput = body.start_time || body.time;
  const hasScheduleIntent = nextDateInput !== undefined || nextTimeInput !== undefined;

  let nd = row.booking_date;
  let nst = normStart(row.start_time);
  if (nextDateInput !== undefined) nd = sliceDate(nextDateInput);
  if (nextTimeInput !== undefined) nst = String(nextTimeInput).slice(0, 5);

  const scheduleChanged = sliceDate(nd) !== sliceDate(row.booking_date) || nst !== normStart(row.start_time);

  if (hasScheduleIntent && scheduleChanged) {
    const result = await runReschedule({
      supabase: admin,
      business,
      actorUserId: user.id,
      existingRow: row,
      newBookingDate: nd,
      newStartHHMM: nst,
      extraPatch: {}
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message, code: result.code || null }, { status: result.status });
    }
    return NextResponse.json({ ok: true, booking: result.booking });
  }

  const patch = {};
  if (body.status !== undefined) {
    const st = typeof body.status === "string" ? body.status.trim() : body.status;
    if (!isBookingStatus(st)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const tx = canTransitionBookingStatus({
      currentStatus: String(row.status),
      nextStatus: String(st),
      booking: row,
      businessTimeZone: business.timezone || "UTC"
    });
    if (!tx.ok) return NextResponse.json({ error: tx.message }, { status: 409 });
    patch.status = st;
  }
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.internal_note !== undefined || body.internalNote !== undefined) {
    const raw = body.internal_note ?? body.internalNote;
    patch.internal_note = raw == null || String(raw).trim() === "" ? null : String(raw).trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields." }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, booking: updated });
}

import { NextResponse } from "next/server";
import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import {
  BOOKING_CONFLICT_CODES,
  bookingBlockConflictMessage,
  findExistingActiveBookingForBlock,
  isBookingBlockConflict
} from "@/lib/booking/booking-conflict";
import { expirePastPendingBookings } from "@/lib/booking/booking-lifecycle";
import { guardStaffJson } from "@/lib/auth/guards";
import { isBookingStatus, normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { normalizeBookingDate } from "@/lib/manager/booking-date-utils";
import { createAdminClient } from "@/lib/supabase/admin";

function toUi(b, names, servicesById) {
  const bookingDate = b.booking_date != null ? b.booking_date : b.date;
  return {
    id: b.id,
    customer: names[b.customer_user_id] || "Student",
    customerUserId: b.customer_user_id,
    date: normalizeBookingDate(bookingDate),
    time: String(b.start_time).slice(0, 5),
    endTime: String(b.end_time).slice(0, 5),
    status: normalizeBookingStatus(b.status) || String(b.status || ""),
    notes: b.notes || "",
    internalNote: b.internal_note != null ? String(b.internal_note) : "",
    service: servicesById[b.service_id]?.name || "—",
    serviceId: b.service_id || null,
    bookingSource: b.booking_source || "legacy"
  };
}

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  await expirePastPendingBookings(supabase, { businessId: business.id, timeZone: business.timezone });

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  /**
   * Match analytics/overview: use service role for roster + bookings. Teacher JWT on `business_users`
   * can miss assigned students under RLS; empty roster made Bookings/Calendar look empty even though
   * `student_direct` / `student_request` rows exist. Student-created bookings also need bypass SELECT.
   */
  let dataDb = supabase;
  try {
    dataDb = createAdminClient();
  } catch {
    dataDb = supabase;
  }

  const { data: roster } = await dataDb
    .from("business_users")
    .select("user_id")
    .eq("business_id", business.id)
    .eq("role", "customer")
    .eq("primary_instructor_user_id", user.id);

  const studentIds = (roster || []).map((r) => r.user_id);
  if (!studentIds.length) {
    return NextResponse.json({ bookings: [] });
  }

  let q = dataDb
    .from("bookings")
    .select("*")
    .eq("business_id", business.id)
    .in("customer_user_id", studentIds)
    .order("booking_date", { ascending: false });

  if (from) q = q.gte("booking_date", from.slice(0, 10));
  if (to) q = q.lte("booking_date", to.slice(0, 10));

  const { data: rows, error } = await q;
  if (error) {
    if (isBookingBlockConflict(error)) {
      return NextResponse.json({ error: bookingBlockConflictMessage() }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ids = [...new Set((rows || []).map((r) => r.customer_user_id))];
  const { data: profs } = ids.length
    ? await dataDb.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const names = Object.fromEntries((profs || []).map((p) => [p.id, p.full_name]));

  const serviceIds = [...new Set((rows || []).map((r) => r.service_id).filter(Boolean))];
  const { data: services } = serviceIds.length
    ? await dataDb.from("services").select("id, name").in("id", serviceIds)
    : { data: [] };
  const servicesById = Object.fromEntries((services || []).map((s) => [s.id, s]));

  return NextResponse.json({
    bookings: (rows || []).map((b) => toUi(b, names, servicesById))
  });
}

export async function POST(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const customerUserId = body.customerUserId;
  const serviceId = body.serviceId || body.service_id || null;
  const booking_date = body.booking_date || body.date;
  const bookingDateYmd = String(booking_date || "").slice(0, 10);
  const start_time = (body.start_time || body.time || "").slice(0, 5);
  const end_time = body.end_time ? String(body.end_time).slice(0, 5) : "";

  if (!customerUserId || !bookingDateYmd || !start_time) {
    return NextResponse.json({ error: "customerUserId, booking_date, and start_time required." }, { status: 400 });
  }

  const { data: mem, error: mErr } = await supabase
    .from("business_users")
    .select("category_id, primary_instructor_user_id")
    .eq("business_id", business.id)
    .eq("user_id", customerUserId)
    .eq("role", "customer")
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 });
  if (!mem || mem.primary_instructor_user_id !== user.id) {
    return NextResponse.json({ error: "You can only book lessons for your assigned students." }, { status: 403 });
  }

  if (serviceId) {
    const { data: svc } = await supabase
      .from("services")
      .select("id, duration_minutes, business_id, is_active")
      .eq("id", serviceId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!svc) return NextResponse.json({ error: "Service not found." }, { status: 400 });
    if (!svc.is_active) return NextResponse.json({ error: "Service is inactive." }, { status: 400 });
  }

  const allowed = await assertBookingAllowed(supabase, {
    business,
    customerUserId,
    bookingDateYmd,
    startHHMM: start_time,
    endHHMM: end_time || undefined,
    excludeBookingId: undefined,
    serviceIdOrNull: serviceId,
    categoryIdOrNull: mem?.category_id || null,
    actingUser: null,
    skipEmailVerification: true
  });
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.message, code: allowed.code || null }, { status: allowed.status });
  }
  const end = allowed.endHHMM;

  const existingBlock = await findExistingActiveBookingForBlock(supabase, {
    businessId: business.id,
    bookingDateYmd,
    startHHMM: start_time,
    endHHMM: end
  });
  if (existingBlock.error) {
    return NextResponse.json({ error: existingBlock.error.message }, { status: 400 });
  }
  if (existingBlock.booking) {
    return NextResponse.json({ code: BOOKING_CONFLICT_CODES.SLOT_ALREADY_BOOKED, error: bookingBlockConflictMessage() }, { status: 409 });
  }

  const defaultStatus = business.auto_confirm_bookings ? "confirmed" : "pending";
  let status = defaultStatus;
  if (body.status != null && body.status !== "") {
    if (!isBookingStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    if (!["pending", "confirmed"].includes(body.status)) {
      return NextResponse.json({ error: "New bookings can only start as pending or confirmed." }, { status: 400 });
    }
    status = body.status;
  }

  const internalRaw = body.internal_note ?? body.internalNote;
  const internal_note =
    internalRaw !== undefined && internalRaw !== null && String(internalRaw).trim() !== ""
      ? String(internalRaw).trim()
      : null;

  const { data: row, error } = await supabase
    .from("bookings")
    .insert({
      business_id: business.id,
      customer_user_id: customerUserId,
      created_by_user_id: user.id,
      service_id: serviceId,
      booking_date: bookingDateYmd,
      start_time: `${start_time}:00`,
      end_time: `${end}:00`,
      status,
      notes: body.notes ? String(body.notes) : null,
      internal_note,
      booking_source: "teacher_manual"
    })
    .select("*")
    .single();

  if (error) {
    if (isBookingBlockConflict(error)) {
      return NextResponse.json(
        { code: BOOKING_CONFLICT_CODES.SLOT_ALREADY_BOOKED, error: bookingBlockConflictMessage() },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: p } = await supabase.from("profiles").select("full_name").eq("id", customerUserId).maybeSingle();
  const servicesById = {};
  if (row?.service_id) {
    const { data: svc } = await supabase.from("services").select("id, name").eq("id", row.service_id).maybeSingle();
    if (svc) servicesById[svc.id] = svc;
  }
  return NextResponse.json({ booking: toUi(row, { [customerUserId]: p?.full_name }, servicesById) });
}

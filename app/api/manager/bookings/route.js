import { NextResponse } from "next/server";
import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import {
  BOOKING_CONFLICT_CODES,
  bookingBlockConflictMessage,
  findExistingActiveBookingForBlock,
  isBookingBlockConflict
} from "@/lib/booking/booking-conflict";
import { expirePastPendingBookings } from "@/lib/booking/booking-lifecycle";
import { guardManagerJson } from "@/lib/auth/guards";
import { isBookingStatus, normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { normalizeBookingDate } from "@/lib/manager/booking-date-utils";

function toUi(b, names, servicesById) {
  const bookingDate = b.booking_date != null ? b.booking_date : b.date;
  return {
    id: b.id,
    customer: names[b.customer_user_id] || "Customer",
    customerUserId: b.customer_user_id,
    date: normalizeBookingDate(bookingDate),
    time: String(b.start_time).slice(0, 5),
    endTime: String(b.end_time).slice(0, 5),
    status: normalizeBookingStatus(b.status) || String(b.status || ""),
    statusChangedAt: b.status_changed_at != null ? String(b.status_changed_at) : null,
    notes: b.notes || "",
    lessonNote: b.lesson_note || "",
    lessonNextFocus: b.lesson_next_focus || "",
    completedAt: b.completed_at || null,
    internalNote: b.internal_note != null ? String(b.internal_note) : "",
    bookingSource: b.booking_source || "legacy",
    service: servicesById[b.service_id]?.name || "—",
    serviceId: b.service_id || null,
    staff: "—",
    amount: 0
  };
}

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  await expirePastPendingBookings(supabase, { businessId: business.id, timeZone: business.timezone });

  // Use * so older databases without newer columns still return bookings (matches portal resilience).
  const { data: rows, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", business.id)
    .order("booking_date", { ascending: false });

  if (error) {
    if (isBookingBlockConflict(error)) {
      return NextResponse.json({ error: bookingBlockConflictMessage() }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ids = [...new Set((rows || []).map((r) => r.customer_user_id))];
  const { data: profs, error: profileError } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [], error: null };
  if (profileError) {
    console.error("[manager/bookings] profile lookup failed:", profileError.message);
  }
  const names = Object.fromEntries((profs || []).map((p) => [p.id, p.full_name]));
  const serviceIds = [...new Set((rows || []).map((r) => r.service_id).filter(Boolean))];
  const { data: services, error: servicesError } = serviceIds.length
    ? await supabase.from("services").select("id, name").in("id", serviceIds)
    : { data: [], error: null };
  if (servicesError) {
    // Keep bookings usable even if services table is unavailable/misconfigured.
    console.error("[manager/bookings] service lookup failed:", servicesError.message);
  }
  const servicesById = Object.fromEntries((services || []).map((s) => [s.id, s]));

  const bookingIds = [...new Set((rows || []).map((r) => r.id).filter(Boolean))];
  const { data: reports } = bookingIds.length
    ? await supabase
        .from("lesson_reports")
        .select("booking_id, notes, next_focus, completed_at")
        .eq("business_id", business.id)
        .in("booking_id", bookingIds)
    : { data: [] };
  const reportByBookingId = Object.fromEntries(
    (reports || []).map((r) => [
      r.booking_id,
      {
        lesson_note: r.notes || "",
        lesson_next_focus: r.next_focus || "",
        completed_at: r.completed_at || null
      }
    ])
  );

  return NextResponse.json({
    bookings: (rows || []).map((b) => toUi({ ...b, ...(reportByBookingId[b.id] || {}) }, names, servicesById))
  });
}

export async function POST(request) {
  const g = await guardManagerJson(request);
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

  if (serviceId) {
    const { data: svc } = await supabase
      .from("services")
      .select("id, duration_minutes, business_id, is_active")
      .eq("id", serviceId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!svc) return NextResponse.json({ error: "Selected service not found for this business." }, { status: 400 });
    if (!svc.is_active) return NextResponse.json({ error: "Selected service is inactive." }, { status: 400 });
  }

  const { data: mem } = await supabase
    .from("business_users")
    .select("category_id")
    .eq("business_id", business.id)
    .eq("user_id", customerUserId)
    .eq("role", "customer")
    .maybeSingle();

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
    const sameUser = existingBlock.booking.customer_user_id === customerUserId;
    if (sameUser && existingBlock.booking.status === "pending") {
      return NextResponse.json(
        { code: BOOKING_CONFLICT_CODES.SLOT_ALREADY_PENDING_FOR_THIS_USER, error: "This user already has this slot pending." },
        { status: 409 }
      );
    }
    if (sameUser) {
      return NextResponse.json(
        { code: BOOKING_CONFLICT_CODES.SLOT_ALREADY_BOOKED_FOR_THIS_USER, error: "This user already has this slot booked." },
        { status: 409 }
      );
    }
    const code =
      existingBlock.booking.status === "pending"
        ? BOOKING_CONFLICT_CODES.SLOT_RESERVED_BY_ANOTHER_USER
        : BOOKING_CONFLICT_CODES.SLOT_ALREADY_BOOKED;
    return NextResponse.json({ code, error: bookingBlockConflictMessage() }, { status: 409 });
  }

  const defaultStatus = business.auto_confirm_bookings ? "confirmed" : "pending";
  let status = defaultStatus;
  if (body.status != null && body.status !== "") {
    if (!isBookingStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    if (!["pending", "confirmed"].includes(body.status)) {
      return NextResponse.json(
        { error: "New bookings can only start as pending or confirmed." },
        { status: 400 }
      );
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
    .select(
      "id, booking_date, start_time, end_time, status, status_changed_at, notes, internal_note, booking_source, customer_user_id, created_by_user_id, service_id"
    )
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
    const { data: svc, error: svcError } = await supabase.from("services").select("id, name").eq("id", row.service_id).maybeSingle();
    if (svcError) {
      console.error("[manager/bookings] inserted service lookup failed:", svcError.message);
    }
    if (svc) servicesById[svc.id] = svc;
  }
  return NextResponse.json({ booking: toUi(row, { [customerUserId]: p?.full_name }, servicesById) });
}

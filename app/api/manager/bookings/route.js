import { NextResponse } from "next/server";
import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import { guardManagerJson } from "@/lib/auth/guards";
import { isBookingStatus } from "@/lib/manager/booking-constants";
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
    status: b.status,
    statusChangedAt: b.status_changed_at != null ? String(b.status_changed_at) : null,
    notes: b.notes || "",
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

  // Use * so older databases without newer columns still return bookings (matches portal resilience).
  const { data: rows, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", business.id)
    .order("booking_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

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

  return NextResponse.json({ bookings: (rows || []).map((b) => toUi(b, names, servicesById)) });
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
  const start_time = (body.start_time || body.time || "").slice(0, 5);

  if (!customerUserId || !booking_date || !start_time) {
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

  const allowed = await assertBookingAllowed(supabase, {
    business,
    customerUserId,
    bookingDateYmd: String(booking_date).slice(0, 10),
    startHHMM: start_time,
    excludeBookingId: undefined,
    serviceIdOrNull: serviceId,
    actingUser: null,
    skipEmailVerification: true
  });
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.message }, { status: allowed.status });
  }
  const end = allowed.endHHMM;

  const defaultStatus = business.auto_confirm_bookings ? "confirmed" : "pending";
  let status = defaultStatus;
  if (body.status != null && body.status !== "") {
    if (!isBookingStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
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
      booking_date,
      start_time: `${start_time}:00`,
      end_time: `${end}:00`,
      status,
      notes: body.notes ? String(body.notes) : null,
      internal_note,
      booking_source: "manual"
    })
    .select(
      "id, booking_date, start_time, end_time, status, status_changed_at, notes, internal_note, booking_source, customer_user_id, created_by_user_id, service_id"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

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

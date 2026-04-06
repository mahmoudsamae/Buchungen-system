import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { isBookingStatus } from "@/lib/manager/booking-constants";
import { assertNoBookingBufferViolation } from "@/lib/booking/booking-buffer";
import { assertNoBookingOverlap } from "@/lib/manager/booking-overlap";
import { runReschedule } from "@/lib/manager/booking-reschedule";
import { addMinutesToTime } from "@/lib/manager/booking-time";

function sliceDate(d) {
  return String(d).slice(0, 10);
}

function normStart(t) {
  return String(t).slice(0, 5);
}

export async function PATCH(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextDateInput = body.booking_date || body.date;
  const nextTimeInput = body.start_time || body.time;
  const hasScheduleIntent = nextDateInput !== undefined || nextTimeInput !== undefined;

  let nd = existing.booking_date;
  let nst = normStart(existing.start_time);
  if (nextDateInput !== undefined) nd = sliceDate(nextDateInput);
  if (nextTimeInput !== undefined) nst = String(nextTimeInput).slice(0, 5);

  const scheduleChanged =
    sliceDate(nd) !== sliceDate(existing.booking_date) || nst !== normStart(existing.start_time);

  if (hasScheduleIntent && scheduleChanged) {
    const extraPatch = {};

    if (body.serviceId !== undefined || body.service_id !== undefined) {
      const serviceId = body.serviceId ?? body.service_id;
      if (!serviceId) {
        extraPatch.service_id = null;
      } else {
        const { data: svc } = await supabase
          .from("services")
          .select("id")
          .eq("id", serviceId)
          .eq("business_id", business.id)
          .maybeSingle();
        if (!svc) {
          return NextResponse.json({ error: "Selected service not found for this business." }, { status: 400 });
        }
        extraPatch.service_id = svc.id;
      }
    }

    if (body.customerUserId !== undefined || body.customer_user_id !== undefined) {
      const cid = body.customerUserId ?? body.customer_user_id;
      if (!cid) {
        return NextResponse.json({ error: "customerUserId cannot be empty." }, { status: 400 });
      }
      const { data: mem } = await supabase
        .from("business_users")
        .select("id")
        .eq("business_id", business.id)
        .eq("user_id", cid)
        .eq("role", "customer")
        .eq("status", "active")
        .maybeSingle();
      if (!mem) {
        return NextResponse.json({ error: "Customer is not active for this business." }, { status: 400 });
      }
      extraPatch.customer_user_id = cid;
    }

    if (body.notes !== undefined) extraPatch.notes = body.notes;
    if (body.internal_note !== undefined || body.internalNote !== undefined) {
      const raw = body.internal_note ?? body.internalNote;
      extraPatch.internal_note = raw == null || String(raw).trim() === "" ? null : String(raw).trim();
    }

    const result = await runReschedule({
      supabase,
      business,
      actorUserId: user.id,
      existingRow: existing,
      newBookingDate: nd,
      newStartHHMM: nst,
      extraPatch
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true, booking: result.booking });
  }

  const patch = {};
  if (body.booking_date || body.date) patch.booking_date = body.booking_date || body.date;
  if (body.status !== undefined) {
    const st = typeof body.status === "string" ? body.status.trim() : body.status;
    if (!isBookingStatus(st)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    patch.status = st;
  }
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.customerUserId !== undefined || body.customer_user_id !== undefined) {
    const cid = body.customerUserId ?? body.customer_user_id;
    if (!cid) {
      return NextResponse.json({ error: "customerUserId cannot be empty." }, { status: 400 });
    }
    const { data: mem } = await supabase
      .from("business_users")
      .select("id")
      .eq("business_id", business.id)
      .eq("user_id", cid)
      .eq("role", "customer")
      .eq("status", "active")
      .maybeSingle();
    if (!mem) {
      return NextResponse.json({ error: "Customer is not active for this business." }, { status: 400 });
    }
    patch.customer_user_id = cid;
  }
  if (body.internal_note !== undefined || body.internalNote !== undefined) {
    const raw = body.internal_note ?? body.internalNote;
    patch.internal_note = raw == null || String(raw).trim() === "" ? null : String(raw).trim();
  }

  if (body.serviceId !== undefined || body.service_id !== undefined) {
    const serviceId = body.serviceId ?? body.service_id;
    if (!serviceId) {
      patch.service_id = null;
    } else {
      const { data: svc } = await supabase
        .from("services")
        .select("id, duration_minutes")
        .eq("id", serviceId)
        .eq("business_id", business.id)
        .maybeSingle();
      if (!svc) return NextResponse.json({ error: "Selected service not found for this business." }, { status: 400 });
      patch.service_id = svc.id;
      if (!body.start_time && !body.time && !body.booking_date && !body.date) {
        const st = String(existing.start_time).slice(0, 5);
        const end = addMinutesToTime(st, Number(svc.duration_minutes) || business.slot_duration_minutes || 30);
        if (end) {
          const overlapSvc = await assertNoBookingOverlap(supabase, {
            businessId: business.id,
            bookingDate: sliceDate(existing.booking_date),
            startHHMM: st,
            endHHMM: end,
            excludeBookingId: id
          });
          if (!overlapSvc.ok) {
            return NextResponse.json({ error: overlapSvc.message }, { status: 409 });
          }
          patch.end_time = `${end}:00`;
        }
      }
    }
  }

  if (body.start_time || body.time) {
    const st = String(body.start_time || body.time).slice(0, 5);
    patch.start_time = `${st}:00`;
    let duration = business.slot_duration_minutes || 30;
    let serviceIdForDuration = patch.service_id;
    if (serviceIdForDuration === undefined) serviceIdForDuration = existing.service_id;
    if (serviceIdForDuration) {
      const { data: svc } = await supabase
        .from("services")
        .select("duration_minutes")
        .eq("id", serviceIdForDuration)
        .maybeSingle();
      if (svc?.duration_minutes) duration = Number(svc.duration_minutes);
    }
    const end = addMinutesToTime(st, duration);
    if (end) patch.end_time = `${end}:00`;

    const dateForOverlap = patch.booking_date
      ? sliceDate(patch.booking_date)
      : sliceDate(existing.booking_date);
    const overlap = await assertNoBookingOverlap(supabase, {
      businessId: business.id,
      bookingDate: dateForOverlap,
      startHHMM: st,
      endHHMM: end,
      excludeBookingId: id
    });
    if (!overlap.ok) {
      return NextResponse.json({ error: overlap.message }, { status: 409 });
    }
    const buf = business.buffer_between_bookings_enabled ? Number(business.buffer_between_bookings_minutes) || 0 : 0;
    const bufferCheck = await assertNoBookingBufferViolation(supabase, {
      businessId: business.id,
      bookingDate: dateForOverlap,
      startHHMM: st,
      endHHMM: end,
      excludeBookingId: id,
      bufferMinutes: buf
    });
    if (!bufferCheck.ok) {
      return NextResponse.json({ error: bufferCheck.message }, { status: 409 });
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields." }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, booking: row });
}

export async function DELETE(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { id } = await params;

  const { error } = await supabase.from("bookings").delete().eq("id", id).eq("business_id", business.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

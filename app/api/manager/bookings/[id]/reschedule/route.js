import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { runReschedule } from "@/lib/manager/booking-reschedule";

/**
 * POST body: { date | booking_date, time | start_time }
 * Moves the booking to a new slot, writes booking_reschedule_history, sets status to pending/confirmed from business settings.
 */
export async function POST(request, { params }) {
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

  const booking_date = body.booking_date || body.date;
  const start_time = String(body.start_time || body.time || "").slice(0, 5);
  if (!booking_date || !start_time) {
    return NextResponse.json({ error: "booking_date and start_time (or time) required." }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await runReschedule({
    supabase,
    business,
    actorUserId: user.id,
    existingRow: existing,
    newBookingDate: booking_date,
    newStartHHMM: start_time,
    extraPatch: {}
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true, booking: result.booking });
}

import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { hasBookingStarted } from "@/lib/booking/booking-lifecycle";

function parseTopics(input) {
  const raw = String(input || "");
  if (!raw.trim()) return [];
  return [...new Set(raw.split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 24);
}

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

  const notes = String(body.notes || "").trim();
  const nextFocus = String(body.nextFocus || body.next_focus || "").trim();
  const topics = parseTopics(body.topics || body.topics_covered);
  const completedAt = body.completed_at ? String(body.completed_at) : new Date().toISOString();
  const visibleToStudent = body.visible_to_student === true || body.visibleToStudent === true;

  if (!notes) {
    return NextResponse.json({ error: "Lesson notes are required." }, { status: 400 });
  }

  const { data: booking, error: loadErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.status !== "confirmed") {
    return NextResponse.json({ error: "Only confirmed bookings can be completed." }, { status: 400 });
  }
  if (!hasBookingStarted(booking, business.timezone || "UTC")) {
    return NextResponse.json(
      { error: "This lesson cannot be marked completed before its start time." },
      { status: 400 }
    );
  }

  const payload = {
    business_id: business.id,
    booking_id: booking.id,
    customer_user_id: booking.customer_user_id,
    written_by_user_id: user.id,
    notes,
    topics_covered: topics,
    next_focus: nextFocus || null,
    completed_at: completedAt
  };

  const { data: report, error: reportErr } = await supabase
    .from("lesson_reports")
    .upsert(payload, { onConflict: "booking_id" })
    .select("*")
    .single();

  if (reportErr) return NextResponse.json({ error: reportErr.message }, { status: 400 });

  const { data: updated, error: updateErr } = await supabase
    .from("bookings")
    .update({ status: "completed", notes: visibleToStudent ? notes : null })
    .eq("id", booking.id)
    .eq("business_id", business.id)
    .select("*")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, booking: updated, report });
}

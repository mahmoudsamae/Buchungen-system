import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { assertTeacherCapability } from "@/lib/auth/teacher-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertTeacherOwnsStudent } from "@/lib/data/teacher-workspace";
import { hasBookingEnded } from "@/lib/booking/booking-lifecycle";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";

function parseTopics(input) {
  const raw = String(input || "");
  if (!raw.trim()) return [];
  return [...new Set(raw.split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 24);
}

export async function POST(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;
  const { id } = await params;

  const cap = await assertTeacherCapability(business.id, user.id, "can_complete_booking");
  if (!cap.ok) return NextResponse.json({ error: cap.message }, { status: cap.status });

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

  const admin = createAdminClient();

  const { data: booking, error: loadErr } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const own = await assertTeacherOwnsStudent(admin, business.id, user.id, booking.customer_user_id);
  if (!own) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const st = normalizeBookingStatus(booking.status) || String(booking.status || "");
  if (st !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed bookings can be completed, and not if already finished or cancelled." },
      { status: 400 }
    );
  }
  const tz = business.timezone || "UTC";
  if (!hasBookingEnded(booking, tz)) {
    return NextResponse.json(
      {
        error:
          "This lesson can only be marked completed after the scheduled end time has passed in the school timezone."
      },
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

  const { data: report, error: reportErr } = await admin
    .from("lesson_reports")
    .upsert(payload, { onConflict: "booking_id" })
    .select("*")
    .single();

  if (reportErr) return NextResponse.json({ error: reportErr.message }, { status: 400 });

  const notesPatch = visibleToStudent
    ? { notes, internal_note: booking.internal_note ?? null }
    : { notes: booking.notes ?? null, internal_note: notes };

  const { data: updated, error: updateErr } = await admin
    .from("bookings")
    .update({ status: "completed", ...notesPatch })
    .eq("id", booking.id)
    .eq("business_id", business.id)
    .eq("status", "confirmed")
    .select("*")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
  if (!updated) {
    return NextResponse.json(
      { error: "This booking could not be completed (it may have just been updated by someone else)." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, booking: updated, report });
}

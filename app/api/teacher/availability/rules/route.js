import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { assertTeacherCapability } from "@/lib/auth/teacher-capabilities";
import { timeToMinutes, timesOverlapHalfOpenMinutes } from "@/lib/manager/booking-time";

function overlap(aStart, aEnd, bStart, bEnd) {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  if ([as, ae, bs, be].some((v) => v == null)) return false;
  return timesOverlapHalfOpenMinutes(as, ae, bs, be);
}

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  const { data: rules, error } = await supabase
    .from("teacher_availability_rules")
    .select("*")
    .eq("business_id", business.id)
    .eq("staff_user_id", user.id)
    .order("weekday")
    .order("start_time");

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ rules: [], error: "Run database migrations for teacher availability." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ rules: rules || [] });
}

export async function POST(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  const cap = await assertTeacherCapability(business.id, user.id, "can_manage_own_availability");
  if (!cap.ok) return NextResponse.json({ error: cap.message }, { status: cap.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const weekday = Number(body.weekday);
  const start_time = String(body.start_time || "").slice(0, 5);
  const end_time = String(body.end_time || "").slice(0, 5);

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !start_time || !end_time) {
    return NextResponse.json({ error: "weekday 0–6, start_time, end_time required." }, { status: 400 });
  }

  if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
    return NextResponse.json({ error: "start_time must be before end_time." }, { status: 400 });
  }

  const valid_from = body.valid_from != null && body.valid_from !== "" ? String(body.valid_from).slice(0, 10) : null;
  const valid_until = body.valid_until != null && body.valid_until !== "" ? String(body.valid_until).slice(0, 10) : null;
  if (valid_from && valid_until && valid_from > valid_until) {
    return NextResponse.json({ error: "valid_from must be on or before valid_until." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("teacher_availability_rules")
    .select("id, start_time, end_time, is_active")
    .eq("business_id", business.id)
    .eq("staff_user_id", user.id)
    .eq("weekday", weekday)
    .eq("is_active", true);

  const hasOverlap = (existing || []).some((r) =>
    overlap(start_time, end_time, String(r.start_time).slice(0, 5), String(r.end_time).slice(0, 5))
  );
  if (hasOverlap) {
    return NextResponse.json({ error: "That window overlaps an existing slot." }, { status: 409 });
  }

  const insert = {
    business_id: business.id,
    staff_user_id: user.id,
    weekday,
    start_time: `${start_time}:00`,
    end_time: `${end_time}:00`,
    is_active: body.is_active !== false,
    valid_from,
    valid_until
  };
  if (body.slot_duration_minutes != null) insert.slot_duration_minutes = Number(body.slot_duration_minutes) || null;
  if (body.buffer_minutes != null) insert.buffer_minutes = Number(body.buffer_minutes) || null;

  const { data: row, error } = await supabase.from("teacher_availability_rules").insert(insert).select().single();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Teacher availability table missing — run migrations." }, { status: 503 });
    }
    if (error.code === "23505") {
      return NextResponse.json({ error: "An identical window already exists for this weekday." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ rule: row });
}

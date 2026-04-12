import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { timeToMinutes, timesOverlapHalfOpenMinutes } from "@/lib/manager/booking-time";

function overlap(aStart, aEnd, bStart, bEnd) {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  if ([as, ae, bs, be].some((v) => v == null)) return false;
  return timesOverlapHalfOpenMinutes(as, ae, bs, be);
}

export async function PATCH(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("teacher_availability_rules")
    .select("id, weekday, start_time, end_time, is_active")
    .eq("id", id)
    .eq("business_id", business.id)
    .eq("staff_user_id", user.id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch = {};
  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);
  if (body.start_time) patch.start_time = `${String(body.start_time).slice(0, 5)}:00`;
  if (body.end_time) patch.end_time = `${String(body.end_time).slice(0, 5)}:00`;
  if (body.valid_from !== undefined) patch.valid_from = body.valid_from ? String(body.valid_from).slice(0, 10) : null;
  if (body.valid_until !== undefined) patch.valid_until = body.valid_until ? String(body.valid_until).slice(0, 10) : null;
  if (body.weekday !== undefined) {
    const w = Number(body.weekday);
    if (!Number.isInteger(w) || w < 0 || w > 6) {
      return NextResponse.json({ error: "weekday must be 0–6." }, { status: 400 });
    }
    patch.weekday = w;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const nextStart = patch.start_time ? String(patch.start_time).slice(0, 5) : String(current.start_time).slice(0, 5);
  const nextEnd = patch.end_time ? String(patch.end_time).slice(0, 5) : String(current.end_time).slice(0, 5);
  const nextWeekday = patch.weekday !== undefined ? patch.weekday : current.weekday;

  if (timeToMinutes(nextStart) >= timeToMinutes(nextEnd)) {
    return NextResponse.json({ error: "start_time must be before end_time." }, { status: 400 });
  }

  const vf = patch.valid_from !== undefined ? patch.valid_from : undefined;
  const vu = patch.valid_until !== undefined ? patch.valid_until : undefined;
  if (vf != null && vu != null && String(vf).slice(0, 10) > String(vu).slice(0, 10)) {
    return NextResponse.json({ error: "valid_from must be on or before valid_until." }, { status: 400 });
  }

  if (patch.is_active !== false) {
    const { data: existing } = await supabase
      .from("teacher_availability_rules")
      .select("id, start_time, end_time, is_active")
      .eq("business_id", business.id)
      .eq("staff_user_id", user.id)
      .eq("weekday", nextWeekday)
      .eq("is_active", true)
      .neq("id", id);

    const hasOverlap = (existing || []).some((r) =>
      overlap(nextStart, nextEnd, String(r.start_time).slice(0, 5), String(r.end_time).slice(0, 5))
    );
    if (hasOverlap) {
      return NextResponse.json({ error: "Updated window overlaps another slot on this day." }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from("teacher_availability_rules")
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id)
    .eq("staff_user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "An identical window already exists for this weekday." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ rule: data });
}

export async function DELETE(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  const { id } = await params;

  const { error } = await supabase
    .from("teacher_availability_rules")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id)
    .eq("staff_user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

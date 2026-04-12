import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { timeToMinutes, timesOverlapHalfOpenMinutes } from "@/lib/manager/booking-time";
import { generateLessonSlotsWithBuffer } from "@/lib/teacher/slot-generator";

function overlap(aStart, aEnd, bStart, bEnd) {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  if ([as, ae, bs, be].some((v) => v == null)) return false;
  return timesOverlapHalfOpenMinutes(as, ae, bs, be);
}

function normalizeHHMM(t) {
  return String(t || "").slice(0, 5);
}

function sqlTime(h) {
  const b = normalizeHHMM(h);
  return b ? `${b}:00` : null;
}

/**
 * Bulk-create weekly rules from generated slot rows, or from explicit slot list.
 * POST body:
 * - mode: "explicit" | "generate"
 * - weekday: 0–6 (required)
 * - replace_weekday: boolean — delete existing active rules for this weekday first
 * - rules: [{ start_time, end_time, valid_from?, valid_until?, slot_duration_minutes?, buffer_minutes? }] (mode explicit)
 * - day_start, day_end, slot_duration_minutes, buffer_minutes, valid_from, valid_until (mode generate)
 */
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

  const weekday = Number(body.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return NextResponse.json({ error: "weekday 0–6 required." }, { status: 400 });
  }

  const replace = Boolean(body.replace_weekday);
  const valid_from = body.valid_from != null && body.valid_from !== "" ? String(body.valid_from).slice(0, 10) : null;
  const valid_until = body.valid_until != null && body.valid_until !== "" ? String(body.valid_until).slice(0, 10) : null;
  if (valid_from && valid_until && valid_from > valid_until) {
    return NextResponse.json({ error: "valid_from must be on or before valid_until." }, { status: 400 });
  }

  let slotRows = [];

  if (body.mode === "generate" || (!body.mode && body.day_start)) {
    const dayStart = normalizeHHMM(body.day_start || body.start_time);
    const dayEnd = normalizeHHMM(body.day_end || body.end_time);
    const duration = Number(body.slot_duration_minutes);
    const buffer = Number(body.buffer_minutes) || 0;
    if (!dayStart || !dayEnd) {
      return NextResponse.json({ error: "day_start and day_end (HH:MM) required for generate mode." }, { status: 400 });
    }
    if (dayStart >= dayEnd) {
      return NextResponse.json({ error: "Start time must be before end time." }, { status: 400 });
    }
    if (!Number.isFinite(duration) || duration < 5) {
      return NextResponse.json({ error: "slot_duration_minutes must be at least 5." }, { status: 400 });
    }
    const generated = generateLessonSlotsWithBuffer(dayStart, dayEnd, duration, buffer);
    slotRows = generated.map((s) => ({
      start_time: s.start,
      end_time: s.end,
      slot_duration_minutes: duration,
      buffer_minutes: buffer
    }));
  } else {
    const rulesIn = Array.isArray(body.rules) ? body.rules : [];
    if (!rulesIn.length) {
      return NextResponse.json({ error: "rules[] required, or use generate mode with day_start/day_end." }, { status: 400 });
    }
    slotRows = rulesIn.map((r) => ({
      start_time: normalizeHHMM(r.start_time),
      end_time: normalizeHHMM(r.end_time),
      slot_duration_minutes: r.slot_duration_minutes != null ? Number(r.slot_duration_minutes) : null,
      buffer_minutes: r.buffer_minutes != null ? Number(r.buffer_minutes) : null
    }));
  }

  for (const r of slotRows) {
    if (!r.start_time || !r.end_time || r.start_time >= r.end_time) {
      return NextResponse.json({ error: "Each rule needs valid start_time and end_time." }, { status: 400 });
    }
  }

  slotRows.sort((a, b) => a.start_time.localeCompare(b.start_time));
  for (let i = 1; i < slotRows.length; i++) {
    if (overlap(slotRows[i - 1].start_time, slotRows[i - 1].end_time, slotRows[i].start_time, slotRows[i].end_time)) {
      return NextResponse.json({ error: "Generated rules overlap each other." }, { status: 409 });
    }
  }

  if (replace) {
    const { error: delErr } = await supabase
      .from("teacher_availability_rules")
      .delete()
      .eq("business_id", business.id)
      .eq("staff_user_id", user.id)
      .eq("weekday", weekday);
    if (delErr) {
      if (delErr.code === "42P01") {
        return NextResponse.json({ error: "Teacher availability table missing — run migrations." }, { status: 503 });
      }
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }
  } else {
    const { data: existing } = await supabase
      .from("teacher_availability_rules")
      .select("id, start_time, end_time, is_active")
      .eq("business_id", business.id)
      .eq("staff_user_id", user.id)
      .eq("weekday", weekday)
      .eq("is_active", true);

    for (const r of slotRows) {
      const hit = (existing || []).some((e) =>
        overlap(r.start_time, r.end_time, normalizeHHMM(e.start_time), normalizeHHMM(e.end_time))
      );
      if (hit) {
        return NextResponse.json(
          { error: "One or more slots overlap existing windows. Replace the weekday or remove overlaps." },
          { status: 409 }
        );
      }
    }
  }

  const insertPayload = slotRows.map((r) => ({
    business_id: business.id,
    staff_user_id: user.id,
    weekday,
    start_time: sqlTime(r.start_time),
    end_time: sqlTime(r.end_time),
    is_active: true,
    slot_duration_minutes: r.slot_duration_minutes != null ? r.slot_duration_minutes : null,
    buffer_minutes: r.buffer_minutes != null ? r.buffer_minutes : null,
    valid_from,
    valid_until
  }));

  const { data: rows, error } = await supabase.from("teacher_availability_rules").insert(insertPayload).select();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Teacher availability table missing — run migrations." }, { status: 503 });
    }
    if (error.code === "23505") {
      return NextResponse.json({ error: "Duplicate window for this weekday." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ rules: rows || [], count: (rows || []).length });
}

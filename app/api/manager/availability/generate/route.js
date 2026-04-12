import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { generateContiguousSlotWindows } from "@/lib/booking/slots";
import { findCategoryForBusiness, normalizeCategoryId } from "@/lib/manager/category-utils";

function normalizeTime(t) {
  const s = String(t || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Generate contiguous availability rules for one weekday, optionally update default slot duration.
 * Body: { weekday, start_time, end_time, slot_duration_minutes }
 */
export async function POST(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const weekday = Number(body.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return NextResponse.json({ error: "weekday must be 0–6 (Sun–Sat)." }, { status: 400 });
  }

  const start_time = normalizeTime(body.start_time);
  const end_time = normalizeTime(body.end_time);
  if (!start_time || !end_time) {
    return NextResponse.json({ error: "start_time and end_time must be like 09:00." }, { status: 400 });
  }

  const slot_duration_minutes = Number(body.slot_duration_minutes);
  const categoryId = normalizeCategoryId(body.categoryId ?? body.category_id);
  if (categoryId !== undefined && categoryId !== null) {
    const { category, error: cErr } = await findCategoryForBusiness(supabase, business.id, categoryId);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Invalid category for this business." }, { status: 400 });
  }

  if (!Number.isFinite(slot_duration_minutes) || slot_duration_minutes < 5 || slot_duration_minutes > 480) {
    return NextResponse.json({ error: "slot_duration_minutes must be between 5 and 480." }, { status: 400 });
  }

  if (start_time >= end_time) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  const windows = generateContiguousSlotWindows(start_time, end_time, slot_duration_minutes);
  if (windows.length === 0) {
    return NextResponse.json({ error: "No full slots fit in that range with the chosen duration." }, { status: 400 });
  }

  const rows = windows.map((w) => ({
    business_id: business.id,
    weekday,
    start_time: `${w.start}:00`,
    end_time: `${w.end}:00`,
    is_active: true,
    category_id: categoryId === undefined ? null : categoryId
  }));

  /** Insert first so a failed business update does not block persisting rules. */
  const { error: insErr } = await supabase.from("availability_rules").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  /** Keep customer booking math aligned: each generated window is one bookable slot at this length. */
  const { error: be } = await supabase
    .from("businesses")
    .update({ slot_duration_minutes })
    .eq("id", business.id);
  if (be) {
    return NextResponse.json(
      {
        ok: true,
        partial: true,
        error: `Availability windows were saved, but updating default slot length failed: ${be.message}`,
        count: rows.length,
        slot_duration_minutes
      },
      { status: 200 }
    );
  }

  const { data: rulesForDay, error: selErr } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("business_id", business.id)
    .eq("weekday", weekday)
    .order("start_time");

  return NextResponse.json({
    ok: true,
    count: rows.length,
    rules: selErr ? [] : rulesForDay || [],
    slot_duration_minutes,
    ...(selErr ? { warning: "Slots saved; list reload skipped in response." } : {})
  });
}

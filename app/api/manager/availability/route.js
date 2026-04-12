import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { findCategoryForBusiness, normalizeCategoryId } from "@/lib/manager/category-utils";
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
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const { data: rules, error } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("business_id", business.id)
    .order("weekday")
    .order("start_time");

  if (error) {
    console.error("[manager/availability GET]", error.code || "", error.message);
    return NextResponse.json({ rules: [], degraded: true });
  }
  const normalized = (rules || []).map((r) => ({
    ...r,
    weekday: Number(r.weekday)
  }));
  return NextResponse.json({ rules: normalized });
}

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
  const start_time = String(body.start_time || "").slice(0, 5);
  const end_time = String(body.end_time || "").slice(0, 5);
  const categoryId = normalizeCategoryId(body.categoryId ?? body.category_id);

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !start_time || !end_time) {
    return NextResponse.json({ error: "weekday 0–6, start_time, end_time required." }, { status: 400 });
  }

  if (categoryId !== undefined && categoryId !== null) {
    const { category, error: cErr } = await findCategoryForBusiness(supabase, business.id, categoryId);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Invalid category for this business." }, { status: 400 });
  }

  const scopeCategoryId = categoryId === undefined ? null : categoryId;
  let existingQuery = supabase
    .from("availability_rules")
    .select("id, start_time, end_time, is_active")
    .eq("business_id", business.id)
    .eq("weekday", weekday)
    .eq("is_active", true);
  existingQuery =
    scopeCategoryId == null ? existingQuery.is("category_id", null) : existingQuery.eq("category_id", scopeCategoryId);
  const { data: existing, error: exErr } = await existingQuery;
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 });

  const hasOverlap = (existing || []).some((r) =>
    overlap(start_time, end_time, String(r.start_time).slice(0, 5), String(r.end_time).slice(0, 5))
  );
  if (hasOverlap) {
    return NextResponse.json(
      { error: "This time range overlaps an existing active window for the same weekday/category scope." },
      { status: 409 }
    );
  }

  const { data: row, error } = await supabase
    .from("availability_rules")
    .insert({
      business_id: business.id,
      weekday,
      start_time: `${start_time}:00`,
      end_time: `${end_time}:00`,
      is_active: body.is_active !== false,
      category_id: categoryId === undefined ? null : categoryId
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rule: row });
}

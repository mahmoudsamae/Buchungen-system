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

export async function PATCH(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = {};
  if (body.weekday != null) patch.weekday = Number(body.weekday);
  if (body.start_time != null) patch.start_time = `${String(body.start_time).slice(0, 5)}:00`;
  if (body.end_time != null) patch.end_time = `${String(body.end_time).slice(0, 5)}:00`;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (body.categoryId !== undefined || body.category_id !== undefined) {
    const categoryId = normalizeCategoryId(body.categoryId ?? body.category_id);
    if (categoryId !== null) {
      const { category, error: cErr } = await findCategoryForBusiness(supabase, business.id, categoryId);
      if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
      if (!category) return NextResponse.json({ error: "Invalid category for this business." }, { status: 400 });
    }
    patch.category_id = categoryId;
  }

  const { data: existing, error: loadErr } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextWeekday = patch.weekday ?? Number(existing.weekday);
  const nextStart = String(patch.start_time ?? existing.start_time).slice(0, 5);
  const nextEnd = String(patch.end_time ?? existing.end_time).slice(0, 5);
  const nextIsActive = patch.is_active ?? existing.is_active;
  const nextCategoryId = patch.category_id ?? existing.category_id ?? null;

  if (nextIsActive) {
    let scopedQuery = supabase
      .from("availability_rules")
      .select("id, start_time, end_time")
      .eq("business_id", business.id)
      .eq("weekday", nextWeekday)
      .eq("is_active", true);
    scopedQuery =
      nextCategoryId == null ? scopedQuery.is("category_id", null) : scopedQuery.eq("category_id", nextCategoryId);
    const { data: scoped, error: se } = await scopedQuery;
    if (se) return NextResponse.json({ error: se.message }, { status: 400 });
    const hasOverlap = (scoped || [])
      .filter((r) => r.id !== id)
      .some((r) => overlap(nextStart, nextEnd, String(r.start_time).slice(0, 5), String(r.end_time).slice(0, 5)));
    if (hasOverlap) {
      return NextResponse.json(
        { error: "This time range overlaps an existing active window for the same weekday/category scope." },
        { status: 409 }
      );
    }
  }

  const { data: row, error } = await supabase
    .from("availability_rules")
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ rule: row });
}

export async function DELETE(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { id } = await params;

  const { error } = await supabase.from("availability_rules").delete().eq("id", id).eq("business_id", business.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

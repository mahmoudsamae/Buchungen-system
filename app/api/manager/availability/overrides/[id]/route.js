import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { findCategoryForBusiness, normalizeCategoryId } from "@/lib/manager/category-utils";
import { timeToMinutes, timesOverlapHalfOpenMinutes } from "@/lib/manager/booking-time";

function normalizeDate(d) {
  const s = String(d || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return s;
}

function normalizeTime(t) {
  if (t == null || t === "") return null;
  const s = String(t || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

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
  // Load existing row to enforce deterministic conflict rules within the same scope.
  const { data: existingRow, error: loadErr } = await supabase
    .from("availability_date_overrides")
    .select("id, date, category_id, is_closed, start_time, end_time, is_active")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 400 });
  if (!existingRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.date != null) {
    const d = normalizeDate(body.date);
    if (!d) return NextResponse.json({ error: "Invalid date (YYYY-MM-DD)." }, { status: 400 });
    patch.date = d;
  }

  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.is_closed === "boolean") patch.is_closed = body.is_closed;

  if (body.categoryId !== undefined || body.category_id !== undefined) {
    const categoryId = normalizeCategoryId(body.categoryId ?? body.category_id);
    if (categoryId !== null) {
      const { category, error: cErr } = await findCategoryForBusiness(supabase, business.id, categoryId);
      if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
      if (!category) return NextResponse.json({ error: "Invalid category for this business." }, { status: 400 });
    }
    patch.category_id = categoryId;
  }

  if (body.start_time !== undefined) {
    const t = normalizeTime(body.start_time);
    if (body.start_time != null && !t) return NextResponse.json({ error: "Invalid start_time." }, { status: 400 });
    patch.start_time = t ? `${t}:00` : null;
  }
  if (body.end_time !== undefined) {
    const t = normalizeTime(body.end_time);
    if (body.end_time != null && !t) return NextResponse.json({ error: "Invalid end_time." }, { status: 400 });
    patch.end_time = t ? `${t}:00` : null;
  }

  // Enforce closed semantics: closed => null times
  if (patch.is_closed === true) {
    patch.start_time = null;
    patch.end_time = null;
  } else if (patch.is_closed === false) {
    // If switching to open, require both times (either provided now or already present).
    const { data: existing, error: ee } = await supabase
      .from("availability_date_overrides")
      .select("start_time, end_time")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (ee) return NextResponse.json({ error: ee.message }, { status: 400 });
    const s = patch.start_time ?? existing?.start_time ?? null;
    const e = patch.end_time ?? existing?.end_time ?? null;
    if (!s || !e) return NextResponse.json({ error: "start_time and end_time required for open overrides." }, { status: 400 });
    if (String(s).slice(0, 5) >= String(e).slice(0, 5)) {
      return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
    }
  }

  // Deterministic conflict handling within (date + category_id) scope:
  // - If we are setting this row to closed and active, deactivate any other active open rows for same scope.
  // - If we are setting this row to open and active, reject if a different active closed row exists in scope.
  const nextDate = patch.date ?? String(existingRow.date).slice(0, 10);
  const nextCategoryId = patch.category_id ?? existingRow.category_id ?? null;
  const nextIsActive = typeof patch.is_active === "boolean" ? patch.is_active : existingRow.is_active !== false;
  const nextIsClosed = typeof patch.is_closed === "boolean" ? patch.is_closed : Boolean(existingRow.is_closed);

  if (nextIsActive) {
    let scopedQuery = supabase
      .from("availability_date_overrides")
      .select("id, is_closed, is_active, start_time, end_time")
      .eq("business_id", business.id)
      .eq("date", nextDate)
      .eq("is_active", true);
    scopedQuery =
      nextCategoryId == null ? scopedQuery.is("category_id", null) : scopedQuery.eq("category_id", nextCategoryId);
    const { data: scoped, error: se } = await scopedQuery;
    if (se) return NextResponse.json({ error: se.message }, { status: 400 });

    const others = (scoped || []).filter((r) => r.id !== existingRow.id);
    if (nextIsClosed) {
      const openIds = others.filter((r) => !r.is_closed).map((r) => r.id);
      if (openIds.length) {
        const { error: deErr } = await supabase
          .from("availability_date_overrides")
          .update({ is_active: false })
          .in("id", openIds)
          .eq("business_id", business.id);
        if (deErr) return NextResponse.json({ error: deErr.message }, { status: 400 });
      }
    } else {
      const hasOtherClosure = others.some((r) => Boolean(r.is_closed));
      if (hasOtherClosure) {
        return NextResponse.json(
          { error: "This date is marked closed for that category scope. Disable/remove the closed override first." },
          { status: 409 }
        );
      }
      const start = String(patch.start_time ?? existingRow.start_time).slice(0, 5);
      const end = String(patch.end_time ?? existingRow.end_time).slice(0, 5);
      const hasOverlap = others.some(
        (r) =>
          !r.is_closed &&
          overlap(start, end, String(r.start_time).slice(0, 5), String(r.end_time).slice(0, 5))
      );
      if (hasOverlap) {
        return NextResponse.json(
          { error: "This window overlaps another active override on the same date/category scope." },
          { status: 409 }
        );
      }
    }
  }

  const { data: row, error } = await supabase
    .from("availability_date_overrides")
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ override: row });
}

export async function DELETE(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { id } = await params;

  const { error } = await supabase
    .from("availability_date_overrides")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


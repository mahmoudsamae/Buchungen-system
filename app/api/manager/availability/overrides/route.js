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

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const from = normalizeDate(request.nextUrl.searchParams.get("from")) || null;
  const to = normalizeDate(request.nextUrl.searchParams.get("to")) || null;
  const categoryId = normalizeCategoryId(request.nextUrl.searchParams.get("categoryId"));

  let q = supabase
    .from("availability_date_overrides")
    .select("*")
    .eq("business_id", business.id)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  if (categoryId) q = q.or(`category_id.is.null,category_id.eq.${categoryId}`);

  const { data, error } = await q;
  if (error) {
    console.error("[manager/availability/overrides GET]", error.code || "", error.message);
    return NextResponse.json({ overrides: [], degraded: true });
  }
  return NextResponse.json({ overrides: data || [] });
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

  const date = normalizeDate(body.date);
  const is_closed = Boolean(body.is_closed);
  const is_active = body.is_active !== false;
  const categoryId = normalizeCategoryId(body.categoryId ?? body.category_id);

  if (!date) return NextResponse.json({ error: "date required (YYYY-MM-DD)." }, { status: 400 });

  if (categoryId !== undefined && categoryId !== null) {
    const { category, error: cErr } = await findCategoryForBusiness(supabase, business.id, categoryId);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Invalid category for this business." }, { status: 400 });
  }

  let start_time = normalizeTime(body.start_time);
  let end_time = normalizeTime(body.end_time);

  if (is_closed) {
    start_time = null;
    end_time = null;
  } else {
    if (!start_time || !end_time) {
      return NextResponse.json({ error: "start_time and end_time required for open overrides." }, { status: 400 });
    }
    if (start_time >= end_time) {
      return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
    }
  }

  // Conflict handling (deterministic):
  // - For a specific scope (date + category_id), a "closed" row wins.
  // - If creating a closed row, automatically deactivate existing open rows for that same scope.
  // - If creating an open row while an active closed row exists for that scope, reject.
  // - Prevent duplicate open windows for the same scope.
  const scopeCategoryId = categoryId === undefined ? null : categoryId; // stored column uses NULL for global

  let existingQuery = supabase
    .from("availability_date_overrides")
    .select("id, is_closed, start_time, end_time, is_active")
    .eq("business_id", business.id)
    .eq("date", date)
    .eq("is_active", true);
  existingQuery =
    scopeCategoryId == null ? existingQuery.is("category_id", null) : existingQuery.eq("category_id", scopeCategoryId);
  const { data: existing, error: exErr } = await existingQuery;
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 });

  const activeExisting = existing || [];
  const hasExistingClosure = activeExisting.some((r) => Boolean(r.is_closed));

  if (!is_closed) {
    if (hasExistingClosure) {
      return NextResponse.json(
        { error: "This date is marked closed for that category scope. Disable/remove the closed override first." },
        { status: 409 }
      );
    }
    const dup = activeExisting.find(
      (r) =>
        !r.is_closed &&
        String(r.start_time).slice(0, 5) === start_time &&
        String(r.end_time).slice(0, 5) === end_time
    );
    if (dup) {
      return NextResponse.json({ error: "That override window already exists for this date." }, { status: 409 });
    }
    const hasOverlap = activeExisting.some(
      (r) =>
        !r.is_closed &&
        overlap(
          start_time,
          end_time,
          String(r.start_time).slice(0, 5),
          String(r.end_time).slice(0, 5)
        )
    );
    if (hasOverlap) {
      return NextResponse.json(
        { error: "This window overlaps another active override on the same date/category scope." },
        { status: 409 }
      );
    }
  } else if (activeExisting.some((r) => !r.is_closed)) {
    // Auto-deactivate open rows for same scope so closure becomes source of truth.
    const openIds = activeExisting.filter((r) => !r.is_closed).map((r) => r.id);
    if (openIds.length) {
      const { error: deErr } = await supabase
        .from("availability_date_overrides")
        .update({ is_active: false })
        .in("id", openIds)
        .eq("business_id", business.id);
      if (deErr) return NextResponse.json({ error: deErr.message }, { status: 400 });
    }
  }

  const { data: row, error } = await supabase
    .from("availability_date_overrides")
    .insert({
      business_id: business.id,
      date,
      start_time: start_time ? `${start_time}:00` : null,
      end_time: end_time ? `${end_time}:00` : null,
      is_closed,
      is_active,
      category_id: scopeCategoryId
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ override: row });
}


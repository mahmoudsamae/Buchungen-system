import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { assertTeacherCapability } from "@/lib/auth/teacher-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import { findCategoryForBusiness, normalizeCategoryId } from "@/lib/manager/category-utils";
import { getTeacherAllowedCategories } from "@/lib/manager/teacher-category-policy";

function normalizeDate(d) {
  const s = String(d || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? s : null;
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

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  const categoryId = normalizeCategoryId(request.nextUrl.searchParams.get("categoryId"));

  const from = normalizeDate(request.nextUrl.searchParams.get("from"));
  const to = normalizeDate(request.nextUrl.searchParams.get("to"));

  let q = supabase
    .from("teacher_availability_overrides")
    .select("*")
    .eq("business_id", business.id)
    .eq("staff_user_id", user.id)
    .order("override_date", { ascending: true });

  if (from) q = q.gte("override_date", from);
  if (to) q = q.lte("override_date", to);
  if (categoryId) q = q.or(`category_id.is.null,category_id.eq.${categoryId}`);

  const { data, error } = await q;
  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ overrides: [], error: "Run migrations for teacher overrides." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ overrides: data || [] });
}

export async function POST(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  let readDb = supabase;
  try {
    readDb = createAdminClient();
  } catch {}
  const allowedCategories = await getTeacherAllowedCategories(readDb, business.id, user.id);

  const cap = await assertTeacherCapability(business.id, user.id, "can_manage_own_availability");
  if (!cap.ok) return NextResponse.json({ error: cap.message }, { status: cap.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const date = normalizeDate(body.date || body.override_date);
  const is_closed = Boolean(body.is_closed);
  const categoryId = normalizeCategoryId(body.categoryId ?? body.category_id);
  if (!date) return NextResponse.json({ error: "date (YYYY-MM-DD) required." }, { status: 400 });
  if (categoryId !== undefined && categoryId !== null) {
    if (allowedCategories.mode === "restricted" && !allowedCategories.categoryIds.has(String(categoryId))) {
      return NextResponse.json({ error: "You can only create overrides for your assigned categories." }, { status: 400 });
    }
    const { category, error: cErr } = await findCategoryForBusiness(readDb, business.id, categoryId);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Invalid category for this business." }, { status: 400 });
  }
  if (allowedCategories.mode === "restricted" && allowedCategories.categoryIds.size > 0 && categoryId == null) {
    return NextResponse.json({ error: "Please select a category for this override." }, { status: 400 });
  }

  let start_time = normalizeTime(body.start_time);
  let end_time = normalizeTime(body.end_time);

  if (is_closed) {
    start_time = null;
    end_time = null;
  } else if (!start_time || !end_time) {
    return NextResponse.json({ error: "start_time and end_time required when not blocking full day." }, { status: 400 });
  }

  const noteRaw = body.note != null ? String(body.note).trim() : "";
  const note = noteRaw ? noteRaw.slice(0, 500) : null;

  const { data: row, error } = await supabase
    .from("teacher_availability_overrides")
    .insert({
      business_id: business.id,
      staff_user_id: user.id,
      override_date: date,
      is_closed,
      start_time: start_time ? `${start_time}:00` : null,
      end_time: end_time ? `${end_time}:00` : null,
      is_active: body.is_active !== false,
      note,
      category_id: categoryId === undefined ? null : categoryId
    })
    .select()
    .single();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Teacher overrides table missing." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ override: row });
}

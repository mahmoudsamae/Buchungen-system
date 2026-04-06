import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";

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

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !start_time || !end_time) {
    return NextResponse.json({ error: "weekday 0–6, start_time, end_time required." }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("availability_rules")
    .insert({
      business_id: business.id,
      weekday,
      start_time: `${start_time}:00`,
      end_time: `${end_time}:00`,
      is_active: body.is_active !== false
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rule: row });
}

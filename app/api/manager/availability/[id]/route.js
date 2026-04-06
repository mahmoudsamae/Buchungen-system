import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";

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

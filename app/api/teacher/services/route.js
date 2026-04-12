import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, is_active, price_cents")
    .eq("business_id", business.id)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ services: data || [] });
}

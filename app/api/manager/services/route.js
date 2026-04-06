import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";

function toUi(row) {
  return {
    id: row.id,
    name: row.name,
    duration: Number(row.duration_minutes),
    price: row.price == null ? null : Number(row.price),
    description: row.description || "",
    status: row.is_active ? "active" : "inactive",
    is_active: Boolean(row.is_active),
    created_at: row.created_at
  };
}

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, description, is_active, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[manager/services GET]", error.code || "", error.message);
    return NextResponse.json({ services: [], degraded: true });
  }
  return NextResponse.json({ services: (data || []).map(toUi) });
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

  const name = String(body.name || "").trim();
  const duration = Number(body.duration ?? body.duration_minutes);
  const price =
    body.price === "" || body.price == null ? null : Number(body.price);
  const description = String(body.description || "").trim();
  const is_active = body.status ? body.status === "active" : body.is_active !== false;

  if (!name) return NextResponse.json({ error: "Service name is required." }, { status: 400 });
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    return NextResponse.json({ error: "Duration must be an integer between 5 and 480 minutes." }, { status: 400 });
  }
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("services")
    .insert({
      business_id: business.id,
      name,
      duration_minutes: duration,
      price,
      description: description || null,
      is_active
    })
    .select("id, name, duration_minutes, price, description, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ service: toUi(data) });
}

import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";

function toUi(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    is_active: Boolean(row.is_active),
    status: row.is_active ? "active" : "inactive",
    created_at: row.created_at
  };
}

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const { data, error } = await supabase
    .from("training_categories")
    .select("id, name, description, is_active, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ categories: (data || []).map(toUi) });
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
  const description = String(body.description || "").trim();
  const is_active = body.is_active !== false;

  if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("training_categories")
    .insert({
      business_id: business.id,
      name,
      description: description || null,
      is_active
    })
    .select("id, name, description, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ category: toUi(data) });
}

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
  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return NextResponse.json({ error: "Category name cannot be empty." }, { status: 400 });
    patch.name = n;
  }
  if (body.description !== undefined) patch.description = String(body.description || "").trim() || null;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (body.status != null) patch.is_active = body.status === "active";

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("training_categories")
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id)
    .select("id, name, description, is_active, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  return NextResponse.json({ category: toUi(data) });
}

export async function DELETE(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { id } = await params;

  const { data, error } = await supabase
    .from("training_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("business_id", business.id)
    .select("id, name, description, is_active, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  return NextResponse.json({ ok: true, category: toUi(data) });
}

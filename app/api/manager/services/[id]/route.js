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
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Service name cannot be empty." }, { status: 400 });
    patch.name = name;
  }
  if (body.duration != null || body.duration_minutes != null) {
    const duration = Number(body.duration ?? body.duration_minutes);
    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      return NextResponse.json({ error: "Duration must be an integer between 5 and 480 minutes." }, { status: 400 });
    }
    patch.duration_minutes = duration;
  }
  if (body.price !== undefined) {
    if (body.price === "" || body.price == null) patch.price = null;
    else {
      const p = Number(body.price);
      if (!Number.isFinite(p) || p < 0) return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
      patch.price = p;
    }
  }
  if (body.description !== undefined) patch.description = String(body.description || "").trim() || null;
  if (body.status != null) patch.is_active = body.status === "active";
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("services")
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id)
    .select("id, name, duration_minutes, price, description, is_active, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Service not found." }, { status: 404 });
  return NextResponse.json({ service: toUi(data) });
}

export async function DELETE(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { id } = await params;

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

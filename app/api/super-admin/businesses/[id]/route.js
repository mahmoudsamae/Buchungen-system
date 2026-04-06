import { NextResponse } from "next/server";
import { guardSuperAdminJson } from "@/lib/auth/guards";
import { getBusinessDetailAdmin, updateBusinessAdmin } from "@/lib/data/super-admin-businesses";

export async function GET(request, { params }) {
  const g = await guardSuperAdminJson();
  if (g.response) return g.response;
  const { id } = await params;
  try {
    const business = await getBusinessDetailAdmin(id);
    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ business });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const g = await guardSuperAdminJson();
  if (g.response) return g.response;
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  delete body.customers;

  try {
    const existing = await getBusinessDetailAdmin(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch = {};
    if (body.name != null) patch.name = String(body.name);
    if (body.slug != null) patch.slug = String(body.slug).toLowerCase().replace(/\s+/g, "-");
    if (body.email != null) patch.email = String(body.email);
    if (body.phone != null) patch.phone = String(body.phone);
    if (body.status != null && ["active", "inactive", "suspended"].includes(body.status)) patch.status = body.status;
    if (body.slot_duration_minutes != null) patch.slot_duration_minutes = Number(body.slot_duration_minutes);

    if (body.manager && typeof body.manager === "object") patch.manager = body.manager;
    if (body.settings && typeof body.settings === "object") patch.settings = body.settings;

    const business = await updateBusinessAdmin(id, patch);
    return NextResponse.json({ business });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 400 });
  }
}

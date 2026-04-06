import { NextResponse } from "next/server";
import { guardSuperAdminJson } from "@/lib/auth/guards";
import { createBusinessWithManagerAdmin, listAllBusinessesAdmin } from "@/lib/data/super-admin-businesses";

export async function GET() {
  const g = await guardSuperAdminJson();
  if (g.response) return g.response;
  try {
    const businesses = await listAllBusinessesAdmin();
    return NextResponse.json({ businesses });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const g = await guardSuperAdminJson();
  if (g.response) return g.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const required = ["name", "slug", "email", "managerFullName", "managerEmail"];
  for (const key of required) {
    if (!body[key] || String(body[key]).trim() === "") {
      return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
    }
  }

  if (!body.initialPassword || String(body.initialPassword).length < 8) {
    return NextResponse.json({ error: "Initial password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const business = await createBusinessWithManagerAdmin({
      name: String(body.name).trim(),
      slug: String(body.slug).trim(),
      email: String(body.email).trim(),
      phone: String(body.phone || "").trim(),
      status: body.status,
      managerFullName: String(body.managerFullName).trim(),
      managerEmail: String(body.managerEmail).trim(),
      initialPassword: String(body.initialPassword)
    });
    return NextResponse.json({ business });
  } catch (e) {
    console.error(e);
    const msg = e.code === "VALIDATION" ? e.message : e.message || "Create failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

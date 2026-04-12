import { NextResponse } from "next/server";
import { guardPlatformOwnerJson } from "@/lib/auth/guards";
import { createPlatformAdminUserAdmin, listPlatformStaffAdmin } from "@/lib/data/super-admin-platform-admins";

export async function GET() {
  const g = await guardPlatformOwnerJson();
  if (g.response) return g.response;
  try {
    const staff = await listPlatformStaffAdmin();
    return NextResponse.json({ staff });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const g = await guardPlatformOwnerJson();
  if (g.response) return g.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const created = await createPlatformAdminUserAdmin({
      email: body.email,
      fullName: body.fullName,
      initialPassword: body.initialPassword
    });
    return NextResponse.json({ admin: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Create failed" }, { status: 400 });
  }
}

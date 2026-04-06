import { NextResponse } from "next/server";
import { guardSuperAdminJson } from "@/lib/auth/guards";
import { getBusinessDetailAdmin, updateManagerSecurityAdmin } from "@/lib/data/super-admin-businesses";

export async function POST(request, { params }) {
  const g = await guardSuperAdminJson();
  if (g.response) return g.response;
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const business = await updateManagerSecurityAdmin(id, {
      loginDisabled: body.loginDisabled,
      forcePasswordChange: body.forcePasswordChange,
      initialPassword: body.initialPassword
    });
    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ business });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Security update failed" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase, user: managerUser } = g.ctx;
  const { userId } = await params;

  const { data: membership } = await supabase
    .from("business_users")
    .select("user_id, role")
    .eq("business_id", business.id)
    .eq("user_id", userId)
    .in("role", ["manager", "staff"])
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Team member not found in this business." }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (body.fullName != null || body.phone != null || body.email != null) {
    const p = {};
    if (body.fullName != null) p.full_name = String(body.fullName);
    if (body.phone != null) p.phone = String(body.phone);
    if (Object.keys(p).length) {
      const { error } = await admin.from("profiles").update(p).eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (body.email != null) {
      const email = String(body.email).trim().toLowerCase();
      const { error: ue } = await admin.auth.admin.updateUserById(userId, { email });
      if (ue) return NextResponse.json({ error: ue.message }, { status: 400 });
      await admin.from("profiles").update({ email }).eq("id", userId);
    }
  }

  if (body.status && ["active", "inactive", "suspended"].includes(body.status)) {
    if (membership.role === "manager" && body.status !== "active" && userId === managerUser.id) {
      return NextResponse.json({ error: "You cannot suspend or deactivate your own owner account while logged in." }, { status: 400 });
    }
    const { error } = await supabase
      .from("business_users")
      .update({ status: body.status })
      .eq("business_id", business.id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase, user: managerUser } = g.ctx;
  const { userId } = await params;

  const { data: membership } = await supabase
    .from("business_users")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (membership.role === "manager") {
    return NextResponse.json(
      { error: "The primary business (owner) account cannot be removed here. Use Super Admin if you must transfer ownership." },
      { status: 400 }
    );
  }

  if (userId === managerUser.id) {
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
  }

  const { error } = await supabase
    .from("business_users")
    .delete()
    .eq("business_id", business.id)
    .eq("user_id", userId)
    .eq("role", "staff");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

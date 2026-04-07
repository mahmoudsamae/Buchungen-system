import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { userId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server misconfigured." }, { status: 500 });
  }

  const { data: membership } = await admin
    .from("business_users")
    .select("user_id")
    .eq("business_id", business.id)
    .eq("user_id", userId)
    .eq("role", "customer")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Customer not found for this business." }, { status: 404 });
  }

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
    const { error } = await supabase
      .from("business_users")
      .update({ status: body.status })
      .eq("business_id", business.id)
      .eq("user_id", userId)
      .eq("role", "customer");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (body.internalNote !== undefined) {
    const { error } = await supabase
      .from("business_users")
      .update({ internal_note: String(body.internalNote || "") })
      .eq("business_id", business.id)
      .eq("user_id", userId)
      .eq("role", "customer");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const newPw = body.newPassword != null ? String(body.newPassword) : "";
  if (newPw.length > 0) {
    if (newPw.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, { password: newPw });
    if (pwErr) return NextResponse.json({ error: pwErr.message || "Could not update password." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { userId } = await params;

  const { error } = await supabase
    .from("business_users")
    .delete()
    .eq("business_id", business.id)
    .eq("user_id", userId)
    .eq("role", "customer");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  /** Membership removed. Auth user + profile are kept (bookings may still reference the user). */
  return NextResponse.json({ ok: true, removedMembership: true });
}

import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

function mapMember(row) {
  const p = row.profiles;
  return {
    id: row.user_id,
    membershipId: row.id,
    fullName: p?.full_name || "",
    email: p?.email || "",
    phone: p?.phone || "",
    role: row.role,
    status: row.status,
    createdAt: row.created_at?.slice(0, 10) || ""
  };
}

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const { data: rows, error } = await supabase
    .from("business_users")
    .select("id, user_id, role, status, created_at, profiles(full_name, email, phone)")
    .eq("business_id", business.id)
    .in("role", ["manager", "staff"])
    .order("role");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const users = (rows || []).map(mapMember);
  users.sort((a, b) => {
    if (a.role === "manager" && b.role !== "manager") return -1;
    if (a.role !== "manager" && b.role === "manager") return 1;
    return 0;
  });

  return NextResponse.json({ users });
}

/** Create internal staff only (not customers — use /api/manager/customers). */
export async function POST(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business } = g.ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const fullName = String(body.fullName || "").trim();
  const phone = body.phone ? String(body.phone).trim() : "";
  const password = String(body.password || "");
  const status = ["active", "inactive", "suspended"].includes(body.status) ? body.status : "active";

  if (!email || !fullName || password.length < 8) {
    return NextResponse.json({ error: "fullName, email, and password (min 8) required." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

  const userId = authData.user.id;

  await admin.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", userId);

  const { data: bu, error: buErr } = await admin
    .from("business_users")
    .insert({
      business_id: business.id,
      user_id: userId,
      role: "staff",
      status
    })
    .select("id, user_id, status, created_at, role")
    .single();

  if (buErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: buErr.message }, { status: 400 });
  }

  const { data: prof } = await admin.from("profiles").select("full_name, email, phone").eq("id", userId).maybeSingle();
  return NextResponse.json({
    user: mapMember({ ...bu, profiles: prof || { full_name: fullName, email, phone: phone || null } })
  });
}

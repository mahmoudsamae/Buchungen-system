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
  const { business } = g.ctx;

  /** Same pattern as GET /api/manager/customers: session client cannot list other members under RLS. */
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server misconfigured." }, { status: 500 });
  }

  const { data: rows, error } = await admin
    .from("business_users")
    .select("id, user_id, role, status, created_at")
    .eq("business_id", business.id)
    .in("role", ["manager", "staff"])
    .order("role");

  if (error) {
    console.error("[manager/team GET] business_users:", error.message, error.code, error.details);
    return NextResponse.json(
      { error: error.message || "Failed to load team.", code: error.code, details: error.details },
      { status: 400 }
    );
  }

  const list = rows || [];
  const userIds = list.map((r) => r.user_id);
  const profileById = new Map();

  if (userIds.length) {
    const { data: profs, error: pErr } = await admin
      .from("profiles")
      .select("id, full_name, email, phone")
      .in("id", userIds);
    if (pErr) {
      console.error("[manager/team GET] profiles:", pErr.message, pErr.code, pErr.details);
      return NextResponse.json(
        { error: pErr.message || "Failed to load profiles.", code: pErr.code, details: pErr.details },
        { status: 400 }
      );
    }
    for (const p of profs || []) {
      profileById.set(String(p.id), p);
    }
  }

  const users = list.map((row) => mapMember({ ...row, profiles: profileById.get(String(row.user_id)) ?? null }));
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

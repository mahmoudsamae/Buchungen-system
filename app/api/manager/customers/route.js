import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { findCategoryForBusiness, normalizeCategoryId } from "@/lib/manager/category-utils";

function mapCustomer(row, profile) {
  const p = profile;
  const fullName =
    p != null && typeof p.full_name === "string" ? p.full_name : "";
  return {
    id: row.user_id,
    membershipId: row.id,
    fullName,
    email: p != null && typeof p.email === "string" ? p.email : "",
    phone: p != null && typeof p.phone === "string" ? p.phone : "",
    status: row.status,
    createdAt: row.created_at?.slice(0, 10) ?? "",
    internalNote: row.internal_note || "",
    categoryId: row.category_id || null
  };
}

/** List customers: business_users (role customer) + profiles — explicit joins; no fragile PostgREST embed. */
export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business } = g.ctx;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server misconfigured." }, { status: 500 });
  }

  const { data: rows, error } = await admin
    .from("business_users")
    .select("id, user_id, status, created_at, internal_note, category_id")
    .eq("business_id", business.id)
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to load customers." }, { status: 400 });
  }

  const list = rows || [];
  const userIds = list.map((r) => r.user_id);
  const profileById = new Map();

  if (userIds.length) {
    const { data: profs, error: pErr } = await admin.from("profiles").select("id, full_name, email, phone").in("id", userIds);
    if (pErr) {
      console.error("[manager/customers GET] profile load failed:", pErr.message);
    } else {
      for (const p of profs || []) {
        profileById.set(String(p.id), p);
      }
    }
  }

  const customers = list.map((row) =>
    mapCustomer(row, profileById.get(String(row.user_id)) ?? null)
  );
  return NextResponse.json({ customers });
}

/**
 * Create a real Auth user (admin API), sync profile, link business_users as customer (active).
 * Rolls back Auth user if profile or membership insert fails.
 */
export async function POST(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business } = g.ctx;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server misconfigured." }, { status: 500 });
  }

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
  const categoryId = normalizeCategoryId(body.categoryId ?? body.category_id);
  if (categoryId !== undefined && categoryId !== null) {
    const { category, error: cErr } = await findCategoryForBusiness(admin, business.id, categoryId);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Invalid category for this business." }, { status: 400 });
  }


  if (!email || !fullName) {
    return NextResponse.json({ error: "fullName and email are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password is required (minimum 8 characters)." }, { status: 400 });
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authErr) {
    return NextResponse.json({ error: authErr.message || "Could not create login for this email." }, { status: 400 });
  }

  const userId = authData?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Account creation did not return a user id." }, { status: 500 });
  }

  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      phone: phone || null
    },
    { onConflict: "id" }
  );

  if (profErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profErr.message || "Could not save customer profile." }, { status: 400 });
  }

  const { data: bu, error: buErr } = await admin
    .from("business_users")
    .insert({
      business_id: business.id,
      user_id: userId,
      role: "customer",
      status: "active",
      category_id: categoryId === undefined ? null : categoryId
    })
    .select("id, user_id, status, created_at, internal_note, category_id")
    .single();

  if (buErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: buErr.message || "Could not attach customer to this business." }, { status: 400 });
  }

  const { data: prof } = await admin.from("profiles").select("full_name, email, phone").eq("id", userId).maybeSingle();

  return NextResponse.json({
    customer: mapCustomer(bu, prof ?? { full_name: fullName, email, phone: phone || null })
  });
}

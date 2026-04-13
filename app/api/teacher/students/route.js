import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { assertTeacherCapability } from "@/lib/auth/teacher-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import { findCategoryForBusiness, normalizeCategoryId } from "@/lib/manager/category-utils";
import { listTeacherStudentsForTable } from "@/lib/data/teacher-workspace";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;
  try {
    const students = await listTeacherStudentsForTable(business.id, user.id);
    return NextResponse.json({ students });
  } catch (e) {
    console.error("[teacher/students GET]", e);
    return NextResponse.json({ error: e.message || "Failed to load students" }, { status: 500 });
  }
}

export async function POST(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;

  const cap = await assertTeacherCapability(business.id, user.id, "can_create_students");
  if (!cap.ok) return NextResponse.json({ error: cap.message }, { status: cap.status });

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

  const admin = createAdminClient();

  if (categoryId !== undefined && categoryId !== null) {
    const { category, error: cErr } = await findCategoryForBusiness(admin, business.id, categoryId);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Invalid category for this business." }, { status: 400 });
  }

  if (!email || !fullName || password.length < 8) {
    return NextResponse.json({ error: "fullName, email, and password (min 8) required." }, { status: 400 });
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authErr) {
    return NextResponse.json({ error: authErr.message || "Could not create login." }, { status: 400 });
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
    return NextResponse.json({ error: profErr.message || "Could not save profile." }, { status: 400 });
  }

  const { data: bu, error: buErr } = await admin
    .from("business_users")
    .insert({
      business_id: business.id,
      user_id: userId,
      role: "customer",
      status: "active",
      category_id: categoryId === undefined ? null : categoryId,
      primary_instructor_user_id: user.id
    })
    .select("id, user_id, status, created_at")
    .single();

  if (buErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: buErr.message || "Could not attach student." }, { status: 400 });
  }

  const { data: prof } = await admin.from("profiles").select("full_name, email, phone").eq("id", userId).maybeSingle();

  return NextResponse.json({
    student: {
      userId,
      fullName: prof?.full_name || fullName,
      email: prof?.email || email,
      phone: prof?.phone || phone || "",
      status: bu.status,
      createdAt: bu.created_at?.slice(0, 10) || ""
    }
  });
}

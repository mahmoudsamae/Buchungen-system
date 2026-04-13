import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherServiceRestriction } from "@/lib/manager/teacher-services-policy";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { data: biz, error: be } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (be || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: mem } = await supabase
    .from("business_users")
    .select("id, category_id, primary_instructor_user_id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const customerCategoryId = mem.category_id || null;
  let q = admin
    .from("services")
    .select("id, name, duration_minutes, price, description, category_id, is_active")
    .eq("business_id", biz.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (customerCategoryId) {
    q = q.or(`category_id.is.null,category_id.eq.${customerCategoryId}`);
  }
  const { data: services, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let rows = services || [];
  const instructorId = mem.primary_instructor_user_id || null;
  if (instructorId) {
    const restriction = await getTeacherServiceRestriction(admin, biz.id, instructorId);
    if (restriction.mode === "restricted") {
      rows = rows.filter((s) => restriction.serviceIds.has(String(s.id)));
    }
  }

  return NextResponse.json({
    services: rows.map((s) => ({
      id: s.id,
      name: s.name,
      duration: Number(s.duration_minutes),
      price: s.price == null ? null : Number(s.price),
      description: s.description || "",
      categoryId: s.category_id || null
    }))
  });
}

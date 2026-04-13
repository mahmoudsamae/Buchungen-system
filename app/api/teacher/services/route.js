import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherServiceRestriction } from "@/lib/manager/teacher-services-policy";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("services")
    .select("id, name, duration_minutes, is_active, price, description, category_id")
    .eq("business_id", business.id)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let rows = (data || []).filter((s) => s.is_active !== false);
  const restriction = await getTeacherServiceRestriction(admin, business.id, user.id);
  if (restriction.mode === "restricted") {
    rows = rows.filter((s) => restriction.serviceIds.has(String(s.id)));
  } else {
    /** No teacher_services rows: teachers do not get the full school catalog (portal/students keep legacy via their own route). */
    rows = [];
  }

  return NextResponse.json({
    services: rows.map((s) => ({
      id: s.id,
      name: s.name,
      duration_minutes: s.duration_minutes,
      is_active: s.is_active,
      price: s.price,
      description: s.description || "",
      category_id: s.category_id || null
    })),
    assignmentMode: restriction.mode === "restricted" ? "restricted" : "unassigned",
    /** True when the school has set at least one teacher_services row (same as restricted mode). */
    hasExplicitAssignments: restriction.mode === "restricted"
  });
}

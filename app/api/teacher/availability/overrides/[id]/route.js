import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";

export async function DELETE(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  const { id } = await params;

  const { error } = await supabase
    .from("teacher_availability_overrides")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id)
    .eq("staff_user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

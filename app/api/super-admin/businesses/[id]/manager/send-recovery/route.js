import { NextResponse } from "next/server";
import { guardPlatformOwnerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/** Sends a Supabase password recovery email to the business manager (school admin). */
export async function POST(_request, { params }) {
  const g = await guardPlatformOwnerJson();
  if (g.response) return g.response;
  const { id } = await params;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("business_users")
    .select("user_id")
    .eq("business_id", id)
    .eq("role", "manager")
    .maybeSingle();

  if (!row?.user_id) {
    return NextResponse.json({ error: "No manager account for this business." }, { status: 404 });
  }

  const { data: prof } = await admin.from("profiles").select("email").eq("id", row.user_id).maybeSingle();
  if (!prof?.email) {
    return NextResponse.json({ error: "No email on file." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: prof.email
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "Recovery email dispatched when SMTP is configured."
  });
}

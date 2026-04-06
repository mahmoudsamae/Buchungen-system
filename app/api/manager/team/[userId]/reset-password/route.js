import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { userId } = await params;

  const { data: row } = await supabase
    .from("business_users")
    .select("user_id")
    .eq("business_id", business.id)
    .eq("user_id", userId)
    .in("role", ["manager", "staff"])
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Team member not found." }, { status: 404 });

  const { data: prof } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (!prof?.email) return NextResponse.json({ error: "No email." }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: prof.email
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    message: "Recovery email dispatched when SMTP is configured."
  });
}

import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST body (optional JSON):
 * - `{ "password": "..." }` — admin sets a new password (min 8 chars). Never logged or returned.
 * - `{}` or omit — legacy: trigger Supabase recovery email (requires SMTP).
 */
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
    .eq("role", "customer")
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Customer not in business." }, { status: 404 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const directPassword = body.password != null ? String(body.password) : "";

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server misconfigured." }, { status: 500 });
  }

  if (directPassword.length > 0) {
    if (directPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { password: directPassword });
    if (error) return NextResponse.json({ error: error.message || "Could not set password." }, { status: 400 });
    return NextResponse.json({ ok: true, method: "direct" });
  }

  const { data: prof } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (!prof?.email) return NextResponse.json({ error: "No email." }, { status: 400 });

  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: prof.email
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    method: "recovery_email",
    message: "Recovery email dispatched when SMTP is configured."
  });
}

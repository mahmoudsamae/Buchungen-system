import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "Invalid credentials." }, { status: 401 });
  }

  const { data: profile, error: pe } = await supabase
    .from("profiles")
    .select("is_platform_super_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  if (pe || !profile?.is_platform_super_admin) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Not a platform super admin." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

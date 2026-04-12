import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimFirstPlatformOwnerIfNeeded } from "@/lib/platform/bootstrap-platform-owner";
import { platformAccessFromProfile } from "@/lib/platform/access";

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
    .select("platform_role, is_platform_super_admin, platform_staff_suspended")
    .eq("id", data.user.id)
    .maybeSingle();

  if (pe || !platformAccessFromProfile(profile).canAccessPlatformAdmin) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Not authorized for platform administration." }, { status: 403 });
  }

  await claimFirstPlatformOwnerIfNeeded(data.user.id);

  return NextResponse.json({ ok: true });
}

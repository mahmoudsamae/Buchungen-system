import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Confirms the logged-in user is an active customer of the business (slug). */
export async function POST(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { slug } = await params;
  const { data: biz } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (!biz) return NextResponse.json({ ok: false }, { status: 404 });

  const { data: mem } = await supabase
    .from("business_users")
    .select("id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ ok: false }, { status: 403 });

  return NextResponse.json({ ok: true });
}

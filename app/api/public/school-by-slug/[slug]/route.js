import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Public branding only — name + slug for login pages (no secrets). */
export async function GET(_request, { params }) {
  const { slug: raw } = await params;
  const slug = String(raw || "").trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: biz, error } = await admin
      .from("businesses")
      .select("name, slug, status")
      .ilike("slug", slug)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "Lookup failed." }, { status: 400 });
    }
    if (!biz) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      name: biz.name,
      slug: biz.slug,
      status: biz.status
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

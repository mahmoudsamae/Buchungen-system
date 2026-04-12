import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sortStudentNotesByPinnedThenDate } from "@/lib/manager/student-notes-sort";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const { data: biz, error: be } = await supabase.from("businesses").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (be || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: mem } = await supabase
    .from("business_users")
    .select("id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: rows, error } = await supabase
    .from("student_notes")
    .select("id, title, content, is_pinned, created_at, visibility")
    .eq("business_id", biz.id)
    .eq("student_id", user.id)
    .eq("visibility", "public")
    .eq("is_active", true)
    .limit(80);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const notes = sortStudentNotesByPinnedThenDate(rows).map(({ visibility: _v, ...rest }) => rest);
  return NextResponse.json({ notes });
}


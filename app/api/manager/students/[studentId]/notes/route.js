import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { normalizeStudentIdParam } from "@/lib/manager/student-route-params";
import { sortStudentNotesByPinnedThenDate } from "@/lib/manager/student-notes-sort";

export async function GET(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const routeParams = await params;
  const idNorm = normalizeStudentIdParam(routeParams.studentId);
  if (!idNorm.ok) {
    return NextResponse.json({ error: idNorm.error }, { status: 400 });
  }
  const studentId = idNorm.studentId;

  const { data: membership } = await supabase
    .from("business_users")
    .select("user_id")
    .eq("business_id", business.id)
    .eq("user_id", studentId)
    .eq("role", "customer")
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Student not found for this business." }, { status: 404 });

  const { data: rows, error } = await supabase
    .from("student_notes")
    .select("*")
    .eq("business_id", business.id)
    .eq("student_id", studentId)
    .eq("is_active", true);

  if (error) {
    console.error("[student_notes GET]", error.code, error.message);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  const notes = sortStudentNotesByPinnedThenDate(rows);
  return NextResponse.json({ notes });
}

export async function POST(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase, user } = g.ctx;
  const routeParams = await params;
  const idNorm = normalizeStudentIdParam(routeParams.studentId);
  if (!idNorm.ok) {
    return NextResponse.json({ error: idNorm.error }, { status: 400 });
  }
  const studentId = idNorm.studentId;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = String(body.content ?? "").trim();
  const title = String(body.title ?? "").trim();
  const visibilityRaw = String(body.visibility ?? "internal").trim().toLowerCase();
  const visibility = visibilityRaw === "public" ? "public" : visibilityRaw === "internal" ? "internal" : null;
  const is_pinned = Boolean(body.is_pinned);

  if (!content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  if (!visibility) {
    return NextResponse.json({ error: "visibility must be public or internal." }, { status: 400 });
  }

  const { data: membership, error: memErr } = await supabase
    .from("business_users")
    .select("user_id")
    .eq("business_id", business.id)
    .eq("user_id", studentId)
    .eq("role", "customer")
    .maybeSingle();

  if (memErr) {
    console.error("[student_notes POST] membership check:", memErr.message);
    return NextResponse.json({ error: memErr.message }, { status: 400 });
  }
  if (!membership) {
    return NextResponse.json({ error: "Student not found for this business." }, { status: 404 });
  }

  const insertPayload = {
    business_id: business.id,
    student_id: studentId,
    author_id: user.id,
    title,
    content,
    visibility,
    is_pinned,
    is_active: true
  };

  const { data: row, error } = await supabase
    .from("student_notes")
    .insert(insertPayload)
    .select(
      "id, business_id, student_id, author_id, title, content, visibility, is_pinned, is_active, created_at, updated_at"
    )
    .single();

  if (error) {
    const code = String(error.code || "");
    const msg = error.message || "Insert failed.";
    console.error("[student_notes POST] insert error:", code, msg);
    const status =
      code === "42501" ||
      code === "PGRST301" ||
      msg.toLowerCase().includes("permission") ||
      msg.toLowerCase().includes("rls")
        ? 403
        : 400;
    return NextResponse.json({ error: msg, code: error.code }, { status });
  }

  if (!row) {
    console.error("[student_notes POST] insert returned no row (RLS or RETURNING blocked?)");
    return NextResponse.json(
      {
        error:
          "Note did not persist or could not be read back. Confirm the workspace in the URL matches your dashboard and try again."
      },
      { status: 500 }
    );
  }

  if (String(row.business_id) !== String(business.id) || String(row.student_id) !== String(studentId)) {
    console.error("[student_notes POST] row mismatch", row.business_id, row.student_id);
    return NextResponse.json({ error: "Persisted note does not match expected business or student." }, { status: 500 });
  }

  return NextResponse.json({ note: row }, { status: 201 });
}

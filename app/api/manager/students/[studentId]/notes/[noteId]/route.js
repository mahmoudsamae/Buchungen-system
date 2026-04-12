import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { normalizeStudentIdParam } from "@/lib/manager/student-route-params";

function normalizeNoteIdParam(raw) {
  return normalizeStudentIdParam(raw);
}

export async function PATCH(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const routeParams = await params;
  const idNorm = normalizeStudentIdParam(routeParams.studentId);
  if (!idNorm.ok) return NextResponse.json({ error: idNorm.error }, { status: 400 });
  const studentId = idNorm.studentId;
  const noteNorm = normalizeNoteIdParam(routeParams.noteId);
  if (!noteNorm.ok) return NextResponse.json({ error: "Invalid note id." }, { status: 400 });
  const noteId = noteNorm.studentId;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = {};
  if (body.title !== undefined) patch.title = String(body.title || "").trim();
  if (body.content !== undefined) patch.content = String(body.content || "").trim();
  if (body.visibility !== undefined) patch.visibility = String(body.visibility || "").trim();
  if (typeof body.is_pinned === "boolean") patch.is_pinned = body.is_pinned;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  if (patch.visibility && !["public", "internal"].includes(patch.visibility)) {
    return NextResponse.json({ error: "visibility must be public or internal." }, { status: 400 });
  }
  if (patch.content !== undefined && !patch.content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("student_notes")
    .update(patch)
    .eq("id", noteId)
    .eq("business_id", business.id)
    .eq("student_id", studentId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note: row });
}

export async function DELETE(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const routeParams = await params;
  const idNorm = normalizeStudentIdParam(routeParams.studentId);
  if (!idNorm.ok) return NextResponse.json({ error: idNorm.error }, { status: 400 });
  const studentId = idNorm.studentId;
  const noteNorm = normalizeNoteIdParam(routeParams.noteId);
  if (!noteNorm.ok) return NextResponse.json({ error: "Invalid note id." }, { status: 400 });
  const noteId = noteNorm.studentId;

  const { error } = await supabase
    .from("student_notes")
    .update({ is_active: false })
    .eq("id", noteId)
    .eq("business_id", business.id)
    .eq("student_id", studentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


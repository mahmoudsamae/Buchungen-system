import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertTeacherOwnsStudent } from "@/lib/data/teacher-workspace";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { normalizeBookingDate } from "@/lib/manager/booking-date-utils";
import { normalizeStudentIdParam } from "@/lib/manager/student-route-params";
import { ensureStudentAccessToken } from "@/lib/student-access/student-access-tokens";

export async function GET(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;
  const idNorm = normalizeStudentIdParam((await params).studentId);
  if (!idNorm.ok) return NextResponse.json({ error: idNorm.error }, { status: 400 });
  const studentId = idNorm.studentId;

  const admin = createAdminClient();
  const ok = await assertTeacherOwnsStudent(admin, business.id, user.id, studentId);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: membership } = await supabase
    .from("business_users")
    .select("user_id, status, internal_note, category_id, created_at, primary_instructor_user_id")
    .eq("business_id", business.id)
    .eq("user_id", studentId)
    .eq("role", "customer")
    .maybeSingle();

  const { data: profileRow } = await admin.from("profiles").select("id, full_name, email, phone").eq("id", studentId).maybeSingle();
  const profile = {
    id: studentId,
    full_name: profileRow?.full_name != null ? String(profileRow.full_name) : "",
    email: profileRow?.email != null ? String(profileRow.email) : "",
    phone: profileRow?.phone != null ? String(profileRow.phone) : ""
  };

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, booking_date, start_time, end_time, status, service_id, notes, internal_note, booking_source")
    .eq("business_id", business.id)
    .eq("customer_user_id", studentId)
    .order("booking_date", { ascending: false });

  const { data: noteRows } = await admin
    .from("student_notes")
    .select("id, title, content, is_pinned, created_at, visibility")
    .eq("business_id", business.id)
    .eq("student_id", studentId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const notes = (noteRows || []).map((n) => ({
    id: n.id,
    title: n.title || "",
    body: n.content != null ? String(n.content) : "",
    is_pinned: n.is_pinned,
    created_at: n.created_at,
    visibility: n.visibility
  }));

  const rows = bookings || [];
  const now = new Date();
  const activeLike = new Set(["pending", "confirmed"]);

  let instructorName = "";
  const insId = membership?.primary_instructor_user_id;
  if (insId) {
    const { data: insProf } = await admin.from("profiles").select("full_name").eq("id", insId).maybeSingle();
    instructorName = insProf?.full_name != null ? String(insProf.full_name).trim() : "";
  }

  let accessToken = null;
  try {
    accessToken = await ensureStudentAccessToken(admin, {
      businessId: business.id,
      teacherUserId: user.id,
      studentUserId: studentId
    });
  } catch (e) {
    console.error("[teacher/students GET] access token", e?.message || e);
  }

  const statusNormalized = ["active", "inactive", "suspended"].includes(String(membership?.status || "").toLowerCase())
    ? String(membership.status).toLowerCase()
    : "active";

  const membershipOut = membership
    ? {
        ...membership,
        status: statusNormalized,
        primary_instructor_user_id: membership.primary_instructor_user_id || user.id
      }
    : {
        user_id: studentId,
        status: statusNormalized,
        primary_instructor_user_id: user.id,
        internal_note: null,
        category_id: null,
        created_at: null
      };

  const completedCount = rows.filter((b) => normalizeBookingStatus(b.status) === "completed").length;
  const pendingApprovalCount = rows.filter((b) => {
    const st = normalizeBookingStatus(b.status) || "";
    const src = String(b.booking_source || "");
    return st === "pending" && (src === "student_request" || src === "portal");
  }).length;

  const upcoming = rows.filter((b) => {
    const st = normalizeBookingStatus(b.status) || "";
    if (!activeLike.has(st)) return false;
    const ds = normalizeBookingDate(b.booking_date);
    const start = new Date(`${ds}T${String(b.start_time).slice(0, 8)}`);
    return !Number.isNaN(start.getTime()) && start > now;
  });

  const nextBooking =
    upcoming.length > 0
      ? upcoming.sort((a, b) => {
          const da = normalizeBookingDate(a.booking_date);
          const db = normalizeBookingDate(b.booking_date);
          if (da !== db) return da.localeCompare(db);
          return String(a.start_time).localeCompare(String(b.start_time));
        })[0]
      : null;

  const lastCompleted = rows
    .filter((b) => normalizeBookingStatus(b.status) === "completed")
    .sort((a, b) => {
      const da = normalizeBookingDate(a.booking_date);
      const db = normalizeBookingDate(b.booking_date);
      if (da !== db) return db.localeCompare(da);
      return String(b.start_time).localeCompare(String(a.start_time));
    })[0];

  const upcomingNormalized = upcoming.map((b) => ({
    id: b.id,
    booking_date: normalizeBookingDate(b.booking_date),
    start_time: String(b.start_time || "").slice(0, 8),
    end_time: String(b.end_time || b.start_time || "").slice(0, 8),
    status: normalizeBookingStatus(b.status) || b.status
  }));

  return NextResponse.json({
    schoolSlug: business.slug,
    membership,
    profile,
    instructorName,
    stats: {
      totalLessons: completedCount,
      upcomingCount: upcoming.length,
      pendingRequests: pendingApprovalCount,
      lastLesson: lastCompleted
        ? `${normalizeBookingDate(lastCompleted.booking_date)} ${String(lastCompleted.start_time).slice(0, 5)}`
        : null,
      nextBooking: nextBooking
        ? `${normalizeBookingDate(nextBooking.booking_date)} ${String(nextBooking.start_time).slice(0, 5)}`
        : null
    },
    access: {
      /** Single canonical entry: opaque token binds business + this teacher + this student */
      canonicalPath: accessToken ? `/student-access/${accessToken}` : null,
      loginPath: accessToken ? `/login/student-access?token=${encodeURIComponent(accessToken)}&next=${encodeURIComponent(`/student/${business.slug}`)}` : null
    },
    bookings: rows.map((b) => ({
      id: b.id,
      date: normalizeBookingDate(b.booking_date),
      time: String(b.start_time).slice(0, 5),
      endTime: String(b.end_time || b.start_time).slice(0, 5),
      status: normalizeBookingStatus(b.status) || b.status,
      bookingSource: b.booking_source || "legacy",
      notes: b.notes || "",
      internalNote: b.internal_note || ""
    })),
    upcoming: upcomingNormalized,
    notes
  });
}

export async function PATCH(request, { params }) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;
  const idNorm = normalizeStudentIdParam((await params).studentId);
  if (!idNorm.ok) return NextResponse.json({ error: idNorm.error }, { status: 400 });
  const studentId = idNorm.studentId;

  const admin = createAdminClient();
  const ok = await assertTeacherOwnsStudent(admin, business.id, user.id, studentId);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.fullName != null || body.phone != null || body.email != null) {
    const p = {};
    if (body.fullName != null) p.full_name = String(body.fullName);
    if (body.phone != null) p.phone = String(body.phone);
    if (Object.keys(p).length) {
      const { error } = await admin.from("profiles").update(p).eq("id", studentId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (body.email != null) {
      const email = String(body.email).trim().toLowerCase();
      const { error: ue } = await admin.auth.admin.updateUserById(studentId, { email });
      if (ue) return NextResponse.json({ error: ue.message }, { status: 400 });
      await admin.from("profiles").update({ email }).eq("id", studentId);
    }
  }

  if (body.status && ["active", "inactive", "suspended"].includes(body.status)) {
    const { error } = await admin
      .from("business_users")
      .update({ status: body.status })
      .eq("business_id", business.id)
      .eq("user_id", studentId)
      .eq("role", "customer");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (body.internalNote !== undefined) {
    const raw = body.internalNote;
    const internal_note = raw == null || String(raw).trim() === "" ? null : String(raw).trim();
    const { error } = await admin
      .from("business_users")
      .update({ internal_note })
      .eq("business_id", business.id)
      .eq("user_id", studentId)
      .eq("role", "customer");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

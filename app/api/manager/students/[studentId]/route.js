import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { BOOKING_TERMINAL_STATUSES } from "@/lib/manager/booking-constants";
import { normalizeStudentIdParam } from "@/lib/manager/student-route-params";
import { sortStudentNotesByPinnedThenDate } from "@/lib/manager/student-notes-sort";

function normalizeBooking(row, serviceName) {
  return {
    id: row.id,
    date: String(row.booking_date || "").slice(0, 10),
    time: String(row.start_time || "").slice(0, 5),
    endTime: String(row.end_time || "").slice(0, 5),
    status: row.status,
    notes: row.notes || "",
    lessonNote: row.lesson_note || "",
    lessonNextFocus: row.lesson_next_focus || "",
    completedAt: row.completed_at || null,
    publicLessonNote: row.notes || "",
    service: serviceName || "—"
  };
}

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
    .select("user_id, status, internal_note, category_id, created_at, primary_instructor_user_id")
    .eq("business_id", business.id)
    .eq("user_id", studentId)
    .eq("role", "customer")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Student not found for this business." }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("id", studentId)
    .maybeSingle();

  let primaryInstructor = null;
  if (membership.primary_instructor_user_id) {
    const { data: insProf } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", membership.primary_instructor_user_id)
      .maybeSingle();
    if (insProf) {
      primaryInstructor = {
        id: insProf.id,
        fullName: insProf.full_name || "",
        email: insProf.email || ""
      };
    }
  }

  let categoryName = null;
  if (membership.category_id) {
    const { data: cat } = await supabase
      .from("training_categories")
      .select("id, name")
      .eq("id", membership.category_id)
      .eq("business_id", business.id)
      .maybeSingle();
    categoryName = cat?.name || null;
  }

  const [
    { count: totalBookings },
    { count: completedBookings },
    { count: upcomingBookingsCount },
    { count: pastBookingsCount },
    { data: upcomingRows, error: upErr },
    { data: pastRows, error: pastErr },
    { data: instructorRows, error: instructorErr }
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("customer_user_id", studentId),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("customer_user_id", studentId)
      .eq("status", "completed"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("customer_user_id", studentId)
      .in("status", ["pending", "confirmed"]),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("customer_user_id", studentId)
      .in("status", BOOKING_TERMINAL_STATUSES),
    supabase
      .from("bookings")
      .select("id, booking_date, start_time, end_time, status, notes, service_id")
      .eq("business_id", business.id)
      .eq("customer_user_id", studentId)
      .in("status", ["pending", "confirmed"])
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(50),
    supabase
      .from("bookings")
      .select("id, booking_date, start_time, end_time, status, notes, service_id")
      .eq("business_id", business.id)
      .eq("customer_user_id", studentId)
      .in("status", BOOKING_TERMINAL_STATUSES)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(50),
    supabase
      .from("business_users")
      .select("user_id, role, status")
      .eq("business_id", business.id)
      .in("role", ["manager", "staff"])
      .eq("status", "active")
  ]);

  if (upErr || pastErr) {
    console.error("[manager/students GET] bookings load error", upErr || pastErr);
    return NextResponse.json(
      { error: (upErr || pastErr)?.message || "Could not load bookings for this student." },
      { status: 400 }
    );
  }

  const { data: noteRows, error: noteErr } = await supabase
    .from("student_notes")
    .select("*")
    .eq("business_id", business.id)
    .eq("student_id", studentId)
    .eq("is_active", true);

  if (noteErr) {
    console.error("[manager/students GET] student_notes error:", noteErr.code, noteErr.message);
    return NextResponse.json(
      { error: `Could not load notes: ${noteErr.message}`, code: noteErr.code },
      { status: 400 }
    );
  }

  const notes = sortStudentNotesByPinnedThenDate(noteRows);

  const allRows = [...(upcomingRows || []), ...(pastRows || [])];
  const serviceIds = [...new Set(allRows.map((x) => x.service_id).filter(Boolean))];
  const { data: svcs } = serviceIds.length
    ? await supabase.from("services").select("id,name").in("id", serviceIds)
    : { data: [] };
  const serviceById = Object.fromEntries((svcs || []).map((x) => [x.id, x.name]));

  const bookingIds = [...new Set(allRows.map((x) => x.id).filter(Boolean))];
  const { data: reports } = bookingIds.length
    ? await supabase
        .from("lesson_reports")
        .select("booking_id, notes, next_focus, completed_at")
        .eq("business_id", business.id)
        .in("booking_id", bookingIds)
    : { data: [] };
  const reportByBookingId = Object.fromEntries(
    (reports || []).map((r) => [
      r.booking_id,
      {
        lesson_note: r.notes || "",
        lesson_next_focus: r.next_focus || "",
        completed_at: r.completed_at || null
      }
    ])
  );

  const upcomingBookings = (upcomingRows || []).map((row) =>
    normalizeBooking({ ...row, ...(reportByBookingId[row.id] || {}) }, serviceById[row.service_id])
  );
  const pastBookings = (pastRows || []).map((row) =>
    normalizeBooking({ ...row, ...(reportByBookingId[row.id] || {}) }, serviceById[row.service_id])
  );

  const instructorIds = [...new Set((instructorRows || []).map((r) => r.user_id).filter(Boolean))];
  const { data: instructorProfiles } = instructorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", instructorIds)
    : { data: [] };
  const instructorProfileById = Object.fromEntries((instructorProfiles || []).map((p) => [p.id, p]));
  const instructors = (instructorRows || [])
    .map((r) => {
      const p = instructorProfileById[r.user_id];
      return {
        id: r.user_id,
        fullName: p?.full_name || "",
        email: p?.email || "",
        role: r.role || "staff"
      };
    })
    .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));

  const { data: categoryServiceRows, error: categoryServicesErr } = membership.category_id
    ? await supabase
        .from("services")
        .select("id, name, duration_minutes, price, category_id, is_active")
        .eq("business_id", business.id)
        .eq("category_id", membership.category_id)
        .eq("is_active", true)
        .order("name", { ascending: true })
    : { data: [], error: null };

  if (instructorErr || categoryServicesErr) {
    console.error("[manager/students GET] instructors/services load error", instructorErr || categoryServicesErr);
  }

  const categoryServices = (categoryServiceRows || []).map((s) => ({
    id: s.id,
    name: s.name || "—",
    duration: Number(s.duration_minutes) || 0,
    price: s.price == null ? null : Number(s.price),
    categoryId: s.category_id || null
  }));

  const lastBooking =
    [...upcomingBookings, ...pastBookings].sort((a, b) => {
      const d = String(b.date || "").localeCompare(String(a.date || ""));
      if (d !== 0) return d;
      return String(b.time || "").localeCompare(String(a.time || ""));
    })[0] || null;

  return NextResponse.json({
    student: {
      id: studentId,
      fullName: profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      status: membership.status || "active",
      categoryId: membership.category_id || null,
      categoryName,
      primaryInstructor,
      createdAt: membership.created_at?.slice(0, 10) || "",
      memberSinceISO: membership.created_at || "",
      trainingStatus: membership.status || "active"
    },
    internalNote: membership.internal_note || "",
    stats: {
      totalBookings: Number(totalBookings) || 0,
      completedBookings: Number(completedBookings) || 0,
      upcomingBookings: Number(upcomingBookingsCount) || 0,
      pastBookings: Number(pastBookingsCount) || 0,
      lastBooking
    },
    instructors,
    categoryServices,
    upcomingBookings,
    pastBookings,
    notes
  });
}

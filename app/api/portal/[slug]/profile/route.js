import { addHours } from "date-fns";
import { NextResponse } from "next/server";
import { zonedStartToUtcDate } from "@/lib/booking/zoned";
import { expirePastPendingBookings } from "@/lib/booking/booking-lifecycle";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_OVERLAP_STATUSES } from "@/lib/manager/booking-constants";
import { sortStudentNotesByPinnedThenDate } from "@/lib/manager/student-notes-sort";

function lessonEndUtc(bookingDateYmd, startHHMM, endHHMM, timeZone) {
  const start = String(startHHMM || "").slice(0, 5);
  const end = String(endHHMM || "").slice(0, 5);
  const startUtc = zonedStartToUtcDate(bookingDateYmd, start, timeZone);
  if (end && end !== start) {
    return zonedStartToUtcDate(bookingDateYmd, end, timeZone);
  }
  return addHours(startUtc, 1);
}

function normalizeBookingRow(row, serviceName) {
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
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, name, slug, timezone")
    .eq("slug", slug)
    .maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const tz = biz.timezone || "UTC";

  const { data: mem } = await supabase
    .from("business_users")
    .select("id, category_id, created_at, primary_instructor_user_id, status")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .maybeSingle();

  let primaryInstructor = null;
  if (mem.primary_instructor_user_id) {
    const { data: ins } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", mem.primary_instructor_user_id)
      .maybeSingle();
    if (ins) primaryInstructor = { fullName: ins.full_name || "", email: ins.email || "" };
  }

  let categoryName = null;
  if (mem.category_id) {
    const { data: cat } = await supabase
      .from("training_categories")
      .select("name")
      .eq("id", mem.category_id)
      .eq("business_id", biz.id)
      .maybeSingle();
    categoryName = cat?.name || null;
  }

  await expirePastPendingBookings(supabase, { businessId: biz.id, timeZone: tz });

  const [{ data: bookingRows }, { data: noteRows }, { count: totalBookings }, { count: completedBookings }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, booking_date, start_time, end_time, status, notes, service_id")
        .eq("business_id", biz.id)
        .eq("customer_user_id", user.id)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(120),
      supabase
        .from("student_notes")
        .select("id, title, content, is_pinned, created_at")
        .eq("business_id", biz.id)
        .eq("student_id", user.id)
        .eq("visibility", "public")
        .eq("is_active", true)
        .limit(80),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", biz.id)
        .eq("customer_user_id", user.id),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", biz.id)
        .eq("customer_user_id", user.id)
        .eq("status", "completed")
    ]);

  const serviceIds = [...new Set((bookingRows || []).map((b) => b.service_id).filter(Boolean))];
  const { data: svcs } = serviceIds.length
    ? await supabase.from("services").select("id,name").in("id", serviceIds)
    : { data: [] };
  const serviceById = Object.fromEntries((svcs || []).map((s) => [s.id, s.name]));

  const bookingIds = [...new Set((bookingRows || []).map((b) => b.id).filter(Boolean))];
  const { data: reports } = bookingIds.length
    ? await supabase
        .from("lesson_reports")
        .select("booking_id, notes, next_focus, completed_at")
        .eq("business_id", biz.id)
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

  const now = new Date();

  const overlap = new Set(BOOKING_OVERLAP_STATUSES);

  const upcoming = [];
  const past = [];

  for (const row of bookingRows || []) {
    const b = normalizeBookingRow({ ...row, ...(reportByBookingId[row.id] || {}) }, serviceById[row.service_id]);
    const endUtc = lessonEndUtc(b.date, b.time, b.endTime, tz);
    const activeBlock = overlap.has(b.status);
    const isPastTime = endUtc < now;
    if (activeBlock && !isPastTime) upcoming.push(b);
    else past.push(b);
  }

  upcoming.sort((a, b) => String(a.date + a.time).localeCompare(String(b.date + b.time)));
  past.sort((a, b) => String(b.date + b.time).localeCompare(String(a.date + a.time)));

  const publicNotes = sortStudentNotesByPinnedThenDate(noteRows);
  const lastBooking =
    [...upcoming, ...past].sort((a, b) => String(b.date + b.time).localeCompare(String(a.date + a.time)))[0] || null;

  const { count: upcomingCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("business_id", biz.id)
    .eq("customer_user_id", user.id)
    .in("status", BOOKING_OVERLAP_STATUSES);

  return NextResponse.json({
    business: { name: biz.name, slug: biz.slug },
    primaryInstructor,
    profile: {
      fullName: profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone || ""
    },
    membership: {
      memberSinceISO: mem.created_at,
      categoryId: mem.category_id,
      categoryName,
      status: mem.status
    },
    stats: {
      totalBookings: Number(totalBookings) || 0,
      completedBookings: Number(completedBookings) || 0,
      upcomingBookings: Number(upcomingCount) || 0,
      lastBooking
    },
    upcomingBookings: upcoming.slice(0, 50),
    pastBookings: past.slice(0, 50),
    publicNotes
  });
}

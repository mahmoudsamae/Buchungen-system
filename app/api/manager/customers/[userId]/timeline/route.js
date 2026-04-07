import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";

function normalizeBooking(row, serviceName) {
  return {
    id: row.id,
    date: String(row.booking_date || "").slice(0, 10),
    time: String(row.start_time || "").slice(0, 5),
    endTime: String(row.end_time || "").slice(0, 5),
    status: row.status,
    notes: row.notes || "",
    service: serviceName || "—"
  };
}

export async function GET(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;
  const { userId } = await params;

  const { data: membership } = await supabase
    .from("business_users")
    .select("user_id, status, internal_note")
    .eq("business_id", business.id)
    .eq("user_id", userId)
    .eq("role", "customer")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Customer not found for this business." }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("id", userId)
    .maybeSingle();

  const { data: rows } = await supabase
    .from("bookings")
    .select("id, booking_date, start_time, end_time, status, notes, service_id")
    .eq("business_id", business.id)
    .eq("customer_user_id", userId)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false });

  const serviceIds = [...new Set((rows || []).map((x) => x.service_id).filter(Boolean))];
  const { data: svcs } = serviceIds.length
    ? await supabase.from("services").select("id,name").in("id", serviceIds)
    : { data: [] };
  const serviceById = Object.fromEntries((svcs || []).map((x) => [x.id, x.name]));

  const bookings = (rows || []).map((row) => normalizeBooking(row, serviceById[row.service_id]));
  const upcomingBookings = bookings.filter((x) => x.status === "pending" || x.status === "confirmed");
  const pastBookings = bookings.filter((x) => !["pending", "confirmed"].includes(x.status));

  const { data: reports } = await supabase
    .from("lesson_reports")
    .select("id, booking_id, notes, topics_covered, next_focus, completed_at, created_at")
    .eq("business_id", business.id)
    .eq("customer_user_id", userId)
    .order("completed_at", { ascending: false });

  const bookingById = Object.fromEntries(bookings.map((b) => [b.id, b]));
  const lessonHistory = (reports || []).map((r) => ({
    id: r.id,
    bookingId: r.booking_id,
    notes: r.notes || "",
    topicsCovered: Array.isArray(r.topics_covered) ? r.topics_covered : [],
    nextFocus: r.next_focus || "",
    completedAt: r.completed_at || r.created_at || null,
    booking: bookingById[r.booking_id] || null
  }));

  return NextResponse.json({
    customer: {
      id: userId,
      fullName: profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      status: membership.status || "active"
    },
    internalNote: membership.internal_note || "",
    upcomingBookings,
    pastBookings,
    lessonHistory
  });
}

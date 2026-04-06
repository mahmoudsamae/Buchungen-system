import { NextResponse } from "next/server";
import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import { createClient } from "@/lib/supabase/server";

export async function POST(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const booking_date = body.booking_date || body.date;
  const start_time = String(body.start_time || body.time || "").slice(0, 5);
  if (!booking_date || !start_time) {
    return NextResponse.json({ error: "booking_date and start_time required" }, { status: 400 });
  }

  const { data: biz, error: be } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
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

  const actingUser = {
    id: user.id,
    email_confirmed_at: user.email_confirmed_at
  };

  const allowed = await assertBookingAllowed(supabase, {
    business: biz,
    customerUserId: user.id,
    bookingDateYmd: String(booking_date).slice(0, 10),
    startHHMM: start_time,
    excludeBookingId: undefined,
    serviceIdOrNull: null,
    actingUser,
    skipEmailVerification: false
  });
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.message }, { status: allowed.status });
  }
  const end = allowed.endHHMM;
  const status = biz.auto_confirm_bookings ? "confirmed" : "pending";

  const { data: row, error } = await supabase
    .from("bookings")
    .insert({
      business_id: biz.id,
      customer_user_id: user.id,
      created_by_user_id: user.id,
      booking_date,
      start_time: `${start_time}:00`,
      end_time: `${end}:00`,
      status,
      notes: body.notes ? String(body.notes) : null,
      booking_source: "portal"
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ booking: row });
}

export async function GET(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { data: biz } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: mem } = await supabase
    .from("business_users")
    .select("id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: rows } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", biz.id)
    .eq("customer_user_id", user.id)
    .order("booking_date", { ascending: false });

  return NextResponse.json({ bookings: rows || [] });
}

import { NextResponse } from "next/server";
import { validateCustomerCancellation } from "@/lib/booking/cancellation-rules";
import { validateTeacherCustomerCancellationPolicy } from "@/lib/booking/teacher-booking-policy";
import { createClient } from "@/lib/supabase/server";

/** Customer: cancel own booking (status → cancelled_by_user). */
export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action || "").toLowerCase();
  if (action !== "cancel") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const { data: biz, error: be } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  if (be || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: mem } = await supabase
    .from("business_users")
    .select("id, primary_instructor_user_id")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: row, error: le } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", biz.id)
    .eq("customer_user_id", user.id)
    .maybeSingle();

  if (le) return NextResponse.json({ error: le.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const v = validateCustomerCancellation(biz, row);
  if (!v.ok) {
    return NextResponse.json({ error: v.message }, { status: 400 });
  }

  const tp = await validateTeacherCustomerCancellationPolicy(supabase, {
    business: biz,
    bookingRow: row,
    primaryInstructorUserId: mem.primary_instructor_user_id || null
  });
  if (!tp.ok) {
    return NextResponse.json({ error: tp.message }, { status: 400 });
  }

  const { data: updated, error: ue } = await supabase
    .from("bookings")
    .update({ status: "cancelled_by_user" })
    .eq("id", id)
    .eq("business_id", biz.id)
    .eq("customer_user_id", user.id)
    .select()
    .single();

  if (ue) return NextResponse.json({ error: ue.message }, { status: 400 });

  return NextResponse.json({ booking: updated });
}

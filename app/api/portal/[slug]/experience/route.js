import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Authenticated customer: safe UX flags + policy text for booking flow. */
export async function GET(request, { params }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
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

  return NextResponse.json({
    booking_policy: biz.booking_policy || "",
    cancellation_policy: biz.cancellation_policy || "",
    show_booking_policy_at_checkout: biz.show_booking_policy_at_checkout !== false,
    show_cancellation_policy_at_checkout: biz.show_cancellation_policy_at_checkout !== false,
    late_cancellation_notice_text: biz.late_cancellation_notice_text || "",
    allow_customer_reschedule: biz.allow_customer_reschedule !== false,
    allow_customer_cancellations: biz.allow_customer_cancellations !== false
  });
}

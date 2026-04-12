import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { getAvailableSlotsForDate } from "@/lib/booking/slot-availability-query";

function normalizeDate(d) {
  const s = String(d || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const date = normalizeDate(request.nextUrl.searchParams.get("date"));
  const customerUserId = String(request.nextUrl.searchParams.get("customerUserId") || "").trim();
  const serviceId = String(request.nextUrl.searchParams.get("serviceId") || "").trim();
  const excludeBookingId = String(request.nextUrl.searchParams.get("excludeBookingId") || "").trim() || undefined;

  if (!date || !customerUserId || !serviceId) {
    return NextResponse.json(
      { error: "date, customerUserId and serviceId are required." },
      { status: 400 }
    );
  }

  const { data: mem } = await supabase
    .from("business_users")
    .select("category_id, primary_instructor_user_id")
    .eq("business_id", business.id)
    .eq("user_id", customerUserId)
    .eq("role", "customer")
    .maybeSingle();
  if (!mem) {
    return NextResponse.json({ error: "Customer is not active for this business." }, { status: 400 });
  }

  const { slots, reason } = await getAvailableSlotsForDate({
    supabase,
    business,
    date,
    categoryId: mem.category_id || null,
    excludeBookingId,
    primaryInstructorUserId: mem.primary_instructor_user_id || null
  });
  const allowedSlots = slots.map((s) => ({
    start: String(s.start).slice(0, 5),
    end: String(s.end).slice(0, 5)
  }));

  return NextResponse.json({
    date,
    slots: allowedSlots,
    reason
  });
}


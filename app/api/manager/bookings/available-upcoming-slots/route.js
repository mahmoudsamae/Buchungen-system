import { NextResponse } from "next/server";
import { addDaysToYmd, calendarDateInTimeZone } from "@/lib/booking/zoned";
import { guardManagerJson } from "@/lib/auth/guards";
import { getAvailableSlotsForDate } from "@/lib/booking/slot-availability-query";

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  const customerUserId = String(request.nextUrl.searchParams.get("customerUserId") || "").trim();
  const serviceId = String(request.nextUrl.searchParams.get("serviceId") || "").trim();
  const horizonDaysRaw = Number(request.nextUrl.searchParams.get("horizonDays") || 14);
  const horizonDays = Number.isFinite(horizonDaysRaw) ? Math.max(1, Math.min(30, Math.trunc(horizonDaysRaw))) : 14;

  if (!customerUserId || !serviceId) {
    return NextResponse.json({ error: "customerUserId and serviceId are required." }, { status: 400 });
  }

  const { data: mem } = await supabase
    .from("business_users")
    .select("category_id, primary_instructor_user_id")
    .eq("business_id", business.id)
    .eq("user_id", customerUserId)
    .eq("role", "customer")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Customer is not active for this business." }, { status: 400 });

  const startDate = calendarDateInTimeZone(business.timezone || "UTC");
  const days = [];
  for (let i = 0; i < horizonDays; i += 1) {
    const date = addDaysToYmd(startDate, i);
    const { slots } = await getAvailableSlotsForDate({
      supabase,
      business,
      date,
      categoryId: mem.category_id || null,
      primaryInstructorUserId: mem.primary_instructor_user_id || null
    });
    if (slots.length) {
      days.push({
        date,
        slots: slots.map((s) => ({ start: String(s.start).slice(0, 5), end: String(s.end).slice(0, 5) }))
      });
    }
  }

  return NextResponse.json({ horizonDays, startDate, days });
}


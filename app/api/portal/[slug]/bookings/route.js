import { NextResponse } from "next/server";
import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import { getPortalInstantBookingPreference } from "@/lib/data/teacher-settings";
import {
  BOOKING_CONFLICT_CODES,
  bookingBlockConflictMessage,
  findExistingActiveBookingForBlock,
  isBookingBlockConflict
} from "@/lib/booking/booking-conflict";
import { expirePastPendingBookings } from "@/lib/booking/booking-lifecycle";
import { isDateInsidePortalBookingWindow, resolvePortalBookingWindow } from "@/lib/booking/portal-booking-window";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";
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
  const bookingDateYmd = String(booking_date || "").slice(0, 10);
  const start_time = String(body.start_time || body.time || "").slice(0, 5);
  const end_time = body.end_time ? String(body.end_time).slice(0, 5) : "";
  if (!bookingDateYmd || !start_time) {
    return NextResponse.json({ error: "booking_date and start_time required" }, { status: 400 });
  }

  const { data: biz, error: be } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  if (be || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  const portalWindow = resolvePortalBookingWindow(biz);
  if (!isDateInsidePortalBookingWindow(bookingDateYmd, portalWindow)) {
    return NextResponse.json(
      {
        error:
          portalWindow.mode === "next_week_only"
            ? `Booking is currently limited to next week (${portalWindow.start} to ${portalWindow.end}).`
            : "Selected date is outside the current booking window."
      },
      { status: 400 }
    );
  }

  const { data: mem } = await supabase
    .from("business_users")
    .select("id, category_id, primary_instructor_user_id, status")
    .eq("business_id", biz.id)
    .eq("user_id", user.id)
    .eq("role", "customer")
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const primaryInstructorUserId = mem.primary_instructor_user_id || null;
  const instantBooking =
    primaryInstructorUserId != null
      ? await getPortalInstantBookingPreference(supabase, biz.id, primaryInstructorUserId, { businessRow: biz })
      : true;

  const actingUser = {
    id: user.id,
    email_confirmed_at: user.email_confirmed_at
  };

  const allowed = await assertBookingAllowed(supabase, {
    business: biz,
    customerUserId: user.id,
    bookingDateYmd,
    startHHMM: start_time,
    endHHMM: end_time || undefined,
    excludeBookingId: undefined,
    serviceIdOrNull: null,
    categoryIdOrNull: mem.category_id || null,
    actingUser,
    skipEmailVerification: false
  });
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.message, code: allowed.code || null }, { status: allowed.status });
  }
  const end = allowed.endHHMM;
  const existingBlock = await findExistingActiveBookingForBlock(supabase, {
    businessId: biz.id,
    bookingDateYmd,
    startHHMM: start_time,
    endHHMM: end
  });
  if (existingBlock.error) {
    return NextResponse.json({ error: existingBlock.error.message }, { status: 400 });
  }
  if (existingBlock.booking) {
    const sameUser = existingBlock.booking.customer_user_id === user.id;
    if (sameUser && existingBlock.booking.status === "pending") {
      return NextResponse.json(
        {
          code: BOOKING_CONFLICT_CODES.SLOT_ALREADY_PENDING_FOR_THIS_USER,
          error: "You already have this slot pending."
        },
        { status: 409 }
      );
    }
    if (sameUser) {
      return NextResponse.json(
        {
          code: BOOKING_CONFLICT_CODES.SLOT_ALREADY_BOOKED_FOR_THIS_USER,
          error: "You already have this slot booked."
        },
        { status: 409 }
      );
    }
    const otherCode =
      existingBlock.booking.status === "pending"
        ? BOOKING_CONFLICT_CODES.SLOT_RESERVED_BY_ANOTHER_USER
        : BOOKING_CONFLICT_CODES.SLOT_ALREADY_BOOKED;
    const otherMsg =
      existingBlock.booking.status === "pending"
        ? "This slot is currently reserved by another user."
        : bookingBlockConflictMessage();
    return NextResponse.json({ code: otherCode, error: otherMsg }, { status: 409 });
  }
  let status;
  let booking_source = "portal";
  if (primaryInstructorUserId) {
    if (!instantBooking) {
      status = "pending";
      booking_source = "student_request";
    } else {
      status = "confirmed";
      booking_source = "student_direct";
    }
  } else {
    status = biz.auto_confirm_bookings ? "confirmed" : "pending";
    booking_source = "portal";
  }

  const { data: row, error } = await supabase
    .from("bookings")
    .insert({
      business_id: biz.id,
      customer_user_id: user.id,
      created_by_user_id: user.id,
      booking_date: bookingDateYmd,
      start_time: `${start_time}:00`,
      end_time: `${end}:00`,
      status,
      notes: body.notes ? String(body.notes) : null,
      booking_source
    })
    .select()
    .single();

  if (error) {
    if (isBookingBlockConflict(error)) {
      const afterConflict = await findExistingActiveBookingForBlock(supabase, {
        businessId: biz.id,
        bookingDateYmd,
        startHHMM: start_time,
        endHHMM: end
      });
      if (afterConflict.booking?.customer_user_id === user.id) {
        return NextResponse.json(
          {
            code:
              afterConflict.booking.status === "pending"
                ? BOOKING_CONFLICT_CODES.SLOT_ALREADY_PENDING_FOR_THIS_USER
                : BOOKING_CONFLICT_CODES.SLOT_ALREADY_BOOKED_FOR_THIS_USER,
            error:
              afterConflict.booking.status === "pending"
                ? "You already have this slot pending."
                : "You already have this slot booked."
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { code: BOOKING_CONFLICT_CODES.SLOT_ALREADY_BOOKED, error: bookingBlockConflictMessage() },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
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

  const { data: bizTz } = await supabase.from("businesses").select("timezone").eq("id", biz.id).maybeSingle();
  await expirePastPendingBookings(supabase, { businessId: biz.id, timeZone: bizTz?.timezone || "UTC" });

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

  const bookings = (rows || []).map((row) => ({
    ...row,
    status: normalizeBookingStatus(row.status) || row.status
  }));
  return NextResponse.json({ bookings });
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { assertBookingAllowed } from "@/lib/booking/assert-booking-allowed";
import { runReschedule } from "@/lib/manager/booking-reschedule";

vi.mock("@/lib/manager/booking-reschedule", async () => {
  const actual = await vi.importActual("@/lib/manager/booking-reschedule");
  return {
    ...actual,
    computeEndTimeForBooking: vi.fn(async () => ({ endHHMM: "09:00", duration: 60 }))
  };
});

const { resolveBookingAvailabilityWindows } = vi.hoisted(() => ({
  resolveBookingAvailabilityWindows: vi.fn(async () => ({
    mode: "open",
    windows: [{ start_time: "08:00", end_time: "09:00" }],
    source: "test"
  }))
}));

vi.mock("@/lib/booking/booking-availability-resolve", () => ({
  resolveBookingAvailabilityWindows
}));

function mockSupabaseWithCustomer() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { primary_instructor_user_id: null }, error: null }))
            }))
          }))
        }))
      }))
    }))
  };
}

vi.mock("@/lib/booking/booking-rules-validate", () => ({
  validateBookingBusinessRules: vi.fn(async () => ({ ok: true }))
}));

vi.mock("@/lib/manager/booking-overlap", () => ({
  assertNoBookingOverlap: vi.fn(async () => ({ ok: true }))
}));

vi.mock("@/lib/booking/booking-buffer", () => ({
  assertNoBookingBufferViolation: vi.fn(async () => ({ ok: true }))
}));

const business = {
  id: "b1",
  timezone: "Europe/Berlin",
  slot_duration_minutes: 60,
  auto_confirm_bookings: false,
  buffer_between_bookings_enabled: false,
  buffer_between_bookings_minutes: 0
};

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  resolveBookingAvailabilityWindows.mockImplementation(async () => ({
    mode: "open",
    windows: [{ start_time: "08:00", end_time: "09:00" }],
    source: "test"
  }));
});

describe("booking wall-clock validation", () => {
  it("rejects past same-day slot in business timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T20:00:00.000Z")); // 22:00 Berlin

    const result = await assertBookingAllowed(mockSupabaseWithCustomer(), {
      business,
      customerUserId: "u1",
      bookingDateYmd: "2026-04-09",
      startHHMM: "08:00",
      endHHMM: "09:00",
      excludeBookingId: undefined,
      serviceIdOrNull: null,
      categoryIdOrNull: null,
      actingUser: null,
      skipEmailVerification: true
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/already passed/i);
  });

  it("rejects past date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T20:00:00.000Z")); // 22:00 Berlin

    const result = await assertBookingAllowed(mockSupabaseWithCustomer(), {
      business,
      customerUserId: "u1",
      bookingDateYmd: "2026-04-08",
      startHHMM: "08:00",
      endHHMM: "09:00",
      excludeBookingId: undefined,
      serviceIdOrNull: null,
      categoryIdOrNull: null,
      actingUser: null,
      skipEmailVerification: true
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/date is in the past/i);
  });

  it("allows a valid future slot", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T20:00:00.000Z")); // 22:00 Berlin

    const result = await assertBookingAllowed(mockSupabaseWithCustomer(), {
      business,
      customerUserId: "u1",
      bookingDateYmd: "2026-04-10",
      startHHMM: "08:00",
      endHHMM: "09:00",
      excludeBookingId: undefined,
      serviceIdOrNull: null,
      categoryIdOrNull: null,
      actingUser: null,
      skipEmailVerification: true
    });

    expect(result.ok).toBe(true);
    expect(result.endHHMM).toBe("09:00");
  });

  it("allows a shorter lesson inside a larger availability window (matches slot picker)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T20:00:00.000Z"));

    resolveBookingAvailabilityWindows.mockResolvedValue({
      mode: "open",
      windows: [{ start_time: "09:00", end_time: "12:00" }],
      source: "test"
    });

    const result = await assertBookingAllowed(mockSupabaseWithCustomer(), {
      business,
      customerUserId: "u1",
      bookingDateYmd: "2026-04-10",
      startHHMM: "09:00",
      endHHMM: "09:30",
      excludeBookingId: "booking-to-exclude",
      serviceIdOrNull: null,
      categoryIdOrNull: null,
      actingUser: null,
      skipEmailVerification: true
    });

    expect(result.ok).toBe(true);
    expect(result.endHHMM).toBe("09:30");
  });

  it("rejects reschedule to a past slot", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T20:00:00.000Z")); // 22:00 Berlin

    const result = await runReschedule({
      supabase: {},
      business,
      actorUserId: "manager1",
      existingRow: {
        id: "booking1",
        business_id: "b1",
        customer_user_id: "u1",
        service_id: null,
        booking_date: "2026-04-10",
        start_time: "08:00:00",
        end_time: "09:00:00",
        status: "pending"
      },
      newBookingDate: "2026-04-09",
      newStartHHMM: "08:00",
      extraPatch: {}
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/already passed|past/i);
  });
});

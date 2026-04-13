/** Client + API shared shape for business / booking settings (camelCase in JSON). */

export function pickDefined(patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function defaultSettingsForm() {
  return {
    businessName: "",
    email: "",
    phone: "",
    timezone: "UTC",
    autoConfirm: true,
    slot_duration_minutes: 30,
    bookingPolicy: "",
    cancellationPolicy: "",
    preventOverlappingBookingsEnabled: false,
    maxBookingsPerDayEnabled: true,
    maxBookingsPerDay: 1,
    maxBookingsPerWeekEnabled: true,
    maxBookingsPerWeek: 2,
    maxBookingsPerMonthEnabled: false,
    maxBookingsPerMonth: 10,
    preventSameDayMultipleBookings: false,
    minNoticeHoursEnabled: false,
    minNoticeHours: 24,
    maxFutureBookingDaysEnabled: false,
    maxFutureBookingDays: 30,
    bufferBetweenBookingsEnabled: false,
    bufferBetweenBookingsMinutes: 15,
    allowCustomerCancellations: true,
    cancellationDeadlineHoursEnabled: false,
    cancellationDeadlineHours: 24,
    lateCancellationNoticeText: "",
    autoMarkNoShowEnabled: false,
    requireAccountToBook: true,
    requireEmailVerificationToBook: false,
    blockAfterNoShowsEnabled: false,
    blockAfterNoShowsCount: 3,
    blockAfterCancellationsEnabled: false,
    blockAfterCancellationsCount: 5,
    showRemainingSlotsToCustomers: false,
    showBookingPolicyAtCheckout: true,
    showCancellationPolicyAtCheckout: true,
    allowCustomerReschedule: true,
    allowSameDayBookings: true,
    bookingReleaseWindowEnabled: false,
    bookingAllowedFrom: "08:00",
    bookingAllowedUntil: "20:00",
    portalBookingWindowMode: "rolling",
    allowTeachersToRestoreCancelledBookings: false
  };
}

/** Typo fix: use AtCheckout in code */
export function businessRowToSettings(b) {
  if (!b) return defaultSettingsForm();
  return {
    businessName: b.name ?? "",
    email: b.email ?? "",
    phone: b.phone ?? "",
    timezone: b.timezone || "UTC",
    autoConfirm: Boolean(b.auto_confirm_bookings),
    slot_duration_minutes: Number(b.slot_duration_minutes) || 30,
    bookingPolicy: b.booking_policy ?? "",
    cancellationPolicy: b.cancellation_policy ?? "",
    preventOverlappingBookingsEnabled: Boolean(b.prevent_overlapping_bookings_enabled),
    maxBookingsPerDayEnabled:
      b.max_bookings_per_day_enabled !== undefined && b.max_bookings_per_day_enabled !== null
        ? Boolean(b.max_bookings_per_day_enabled)
        : true,
    maxBookingsPerDay:
      b.max_bookings_per_day != null
        ? Number(b.max_bookings_per_day)
        : b.prevent_same_day_multiple_bookings
          ? 1
          : 1,
    maxBookingsPerWeekEnabled: b.max_bookings_per_week_enabled !== false,
    maxBookingsPerWeek: Number(b.max_bookings_per_week) || 2,
    maxBookingsPerMonthEnabled: Boolean(b.max_bookings_per_month_enabled),
    maxBookingsPerMonth: Number(b.max_bookings_per_month) || 10,
    preventSameDayMultipleBookings: Boolean(b.prevent_same_day_multiple_bookings),
    minNoticeHoursEnabled: Boolean(b.min_notice_hours_enabled),
    minNoticeHours: b.min_notice_hours != null ? Number(b.min_notice_hours) : 24,
    maxFutureBookingDaysEnabled: Boolean(b.max_future_booking_days_enabled),
    maxFutureBookingDays: Number(b.max_future_booking_days) || 30,
    bufferBetweenBookingsEnabled: Boolean(b.buffer_between_bookings_enabled),
    bufferBetweenBookingsMinutes: Number(b.buffer_between_bookings_minutes) || 15,
    allowCustomerCancellations: b.allow_customer_cancellations !== false,
    cancellationDeadlineHoursEnabled: Boolean(b.cancellation_deadline_hours_enabled),
    cancellationDeadlineHours: b.cancellation_deadline_hours != null ? Number(b.cancellation_deadline_hours) : 24,
    lateCancellationNoticeText: b.late_cancellation_notice_text ?? "",
    autoMarkNoShowEnabled: Boolean(b.auto_mark_no_show_enabled),
    requireAccountToBook: b.require_account_to_book !== false,
    requireEmailVerificationToBook: Boolean(b.require_email_verification_to_book),
    blockAfterNoShowsEnabled: Boolean(b.block_after_no_shows_enabled),
    blockAfterNoShowsCount: Number(b.block_after_no_shows_count) || 3,
    blockAfterCancellationsEnabled: Boolean(b.block_after_cancellations_enabled),
    blockAfterCancellationsCount: Number(b.block_after_cancellations_count) || 5,
    showRemainingSlotsToCustomers: Boolean(b.show_remaining_slots_to_customers),
    showBookingPolicyAtCheckout: b.show_booking_policy_at_checkout !== false,
    showCancellationPolicyAtCheckout: b.show_cancellation_policy_at_checkout !== false,
    allowCustomerReschedule: b.allow_customer_reschedule !== false,
    allowSameDayBookings: b.allow_same_day_bookings !== false,
    bookingReleaseWindowEnabled: Boolean(b.booking_release_window_enabled),
    bookingAllowedFrom: String(b.booking_allowed_from || "08:00:00").slice(0, 5),
    bookingAllowedUntil: String(b.booking_allowed_until || "20:00:00").slice(0, 5),
    portalBookingWindowMode:
      b.portal_booking_window_mode === "next_week_only" ? "next_week_only" : "rolling",
    allowTeachersToRestoreCancelledBookings: Boolean(b.allow_teachers_to_restore_cancelled_bookings)
  };
}

export function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

/** @param {string} tz */
export function isValidIanaTimeZone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate manager PATCH body. Returns `{ errors: string[] }` (empty = ok).
 * @param {Record<string, unknown>} body — merged form payload
 */
export function validateBusinessSettingsPayload(body) {
  const errors = [];
  const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const name = body.businessName != null ? String(body.businessName).trim() : "";
  if (!name) errors.push("Business name is required.");

  const email = body.email != null ? String(body.email).trim() : "";
  if (!isValidEmail(email)) errors.push("Enter a valid business email.");

  const phone = body.phone != null ? String(body.phone) : "";
  if (phone.length > 40) errors.push("Phone is too long.");

  const tz = body.timezone != null ? String(body.timezone).trim() : "UTC";
  if (!isValidIanaTimeZone(tz)) errors.push("Select a valid timezone.");

  const slot = Number(body.slot_duration_minutes);
  if (!Number.isFinite(slot) || slot < 5 || slot > 480) {
    errors.push("Slot duration must be between 5 and 480 minutes.");
  }

  if (body.maxBookingsPerWeekEnabled) {
    const n = Number(body.maxBookingsPerWeek);
    if (!Number.isFinite(n) || n < 1 || n > 500) errors.push("Weekly booking limit must be between 1 and 500.");
  }
  if (body.maxBookingsPerDayEnabled) {
    const n = Number(body.maxBookingsPerDay);
    if (!Number.isFinite(n) || n < 1 || n > 50) errors.push("Daily booking limit must be between 1 and 50.");
  }
  if (body.maxBookingsPerMonthEnabled) {
    const n = Number(body.maxBookingsPerMonth);
    if (!Number.isFinite(n) || n < 1 || n > 2000) errors.push("Monthly booking limit must be between 1 and 2000.");
  }
  if (body.minNoticeHoursEnabled) {
    const n = Number(body.minNoticeHours);
    if (!Number.isFinite(n) || n < 0 || n > 8760) errors.push("Minimum notice must be between 0 and 8760 hours.");
  }
  if (body.maxFutureBookingDaysEnabled) {
    const n = Number(body.maxFutureBookingDays);
    if (!Number.isFinite(n) || n < 1 || n > 730) errors.push("Maximum advance window must be between 1 and 730 days.");
  }
  if (body.bufferBetweenBookingsEnabled) {
    const n = Number(body.bufferBetweenBookingsMinutes);
    if (!Number.isFinite(n) || n < 0 || n > 480) errors.push("Buffer must be between 0 and 480 minutes.");
  }
  if (body.cancellationDeadlineHoursEnabled) {
    const n = Number(body.cancellationDeadlineHours);
    if (!Number.isFinite(n) || n < 0 || n > 8760) errors.push("Cancellation deadline must be between 0 and 8760 hours.");
  }
  if (body.blockAfterNoShowsEnabled) {
    const n = Number(body.blockAfterNoShowsCount);
    if (!Number.isFinite(n) || n < 1 || n > 100) errors.push("No-show threshold must be between 1 and 100.");
  }
  if (body.blockAfterCancellationsEnabled) {
    const n = Number(body.blockAfterCancellationsCount);
    if (!Number.isFinite(n) || n < 1 || n > 500) errors.push("Cancellation threshold must be between 1 and 500.");
  }
  if (body.bookingReleaseWindowEnabled) {
    const from = String(body.bookingAllowedFrom || "").slice(0, 5);
    const until = String(body.bookingAllowedUntil || "").slice(0, 5);
    if (!hhmm.test(from) || !hhmm.test(until)) {
      errors.push("Booking window times must be valid HH:mm values.");
    } else if (from >= until) {
      errors.push("Booking allowed until must be later than booking allowed from.");
    }
  }
  if (body.portalBookingWindowMode != null) {
    const mode = String(body.portalBookingWindowMode);
    if (!["rolling", "next_week_only"].includes(mode)) {
      errors.push("Booking window mode must be rolling or next_week_only.");
    }
  }

  return { errors };
}

/** Map full settings form from client to DB row fragment (snake_case). */
export function settingsFormToDbRow(form) {
  return {
    name: String(form.businessName ?? "").trim(),
    email: String(form.email ?? "").trim(),
    phone: String(form.phone ?? "").trim() || null,
    timezone: String(form.timezone ?? "UTC").trim(),
    auto_confirm_bookings: Boolean(form.autoConfirm),
    slot_duration_minutes: Number(form.slot_duration_minutes) || 30,
    booking_policy: String(form.bookingPolicy ?? "") || null,
    cancellation_policy: String(form.cancellationPolicy ?? "") || null,
    prevent_overlapping_bookings_enabled: Boolean(form.preventOverlappingBookingsEnabled),
    max_bookings_per_day_enabled: Boolean(form.maxBookingsPerDayEnabled),
    max_bookings_per_day: Math.max(1, Number(form.maxBookingsPerDay) || 1),
    max_bookings_per_week_enabled: Boolean(form.maxBookingsPerWeekEnabled),
    max_bookings_per_week: Math.max(1, Number(form.maxBookingsPerWeek) || 1),
    max_bookings_per_month_enabled: Boolean(form.maxBookingsPerMonthEnabled),
    max_bookings_per_month: Math.max(1, Number(form.maxBookingsPerMonth) || 1),
    prevent_same_day_multiple_bookings: Boolean(form.maxBookingsPerDayEnabled && Math.max(1, Number(form.maxBookingsPerDay) || 1) <= 1),
    min_notice_hours_enabled: Boolean(form.minNoticeHoursEnabled),
    min_notice_hours: Math.max(0, Number(form.minNoticeHours) || 0),
    max_future_booking_days_enabled: Boolean(form.maxFutureBookingDaysEnabled),
    max_future_booking_days: Math.max(1, Number(form.maxFutureBookingDays) || 1),
    buffer_between_bookings_enabled: Boolean(form.bufferBetweenBookingsEnabled),
    buffer_between_bookings_minutes: Math.max(0, Number(form.bufferBetweenBookingsMinutes) || 0),
    allow_customer_cancellations: Boolean(form.allowCustomerCancellations),
    cancellation_deadline_hours_enabled: Boolean(form.cancellationDeadlineHoursEnabled),
    cancellation_deadline_hours: Math.max(0, Number(form.cancellationDeadlineHours) || 0),
    late_cancellation_notice_text: String(form.lateCancellationNoticeText ?? ""),
    auto_mark_no_show_enabled: Boolean(form.autoMarkNoShowEnabled),
    require_account_to_book: Boolean(form.requireAccountToBook),
    require_email_verification_to_book: Boolean(form.requireEmailVerificationToBook),
    block_after_no_shows_enabled: Boolean(form.blockAfterNoShowsEnabled),
    block_after_no_shows_count: Math.max(1, Number(form.blockAfterNoShowsCount) || 1),
    block_after_cancellations_enabled: Boolean(form.blockAfterCancellationsEnabled),
    block_after_cancellations_count: Math.max(1, Number(form.blockAfterCancellationsCount) || 1),
    show_remaining_slots_to_customers: Boolean(form.showRemainingSlotsToCustomers),
    show_booking_policy_at_checkout: Boolean(form.showBookingPolicyAtCheckout),
    show_cancellation_policy_at_checkout: Boolean(form.showCancellationPolicyAtCheckout),
    allow_customer_reschedule: Boolean(form.allowCustomerReschedule),
    allow_same_day_bookings: Boolean(form.allowSameDayBookings),
    booking_release_window_enabled: Boolean(form.bookingReleaseWindowEnabled),
    booking_allowed_from: `${String(form.bookingAllowedFrom || "08:00").slice(0, 5)}:00`,
    booking_allowed_until: `${String(form.bookingAllowedUntil || "20:00").slice(0, 5)}:00`,
    portal_booking_window_mode:
      String(form.portalBookingWindowMode || "rolling") === "next_week_only" ? "next_week_only" : "rolling",
    allow_teachers_to_restore_cancelled_bookings: Boolean(form.allowTeachersToRestoreCancelledBookings)
  };
}

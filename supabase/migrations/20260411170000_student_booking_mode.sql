-- Per-teacher preference: how student portal bookings are created (staff row only).
ALTER TABLE business_users
  ADD COLUMN IF NOT EXISTS student_booking_mode text NOT NULL DEFAULT 'direct'
    CHECK (student_booking_mode IN ('direct', 'approval_required'));

COMMENT ON COLUMN business_users.student_booking_mode IS 'For role=staff: direct = student bookings confirmed immediately; approval_required = pending until teacher approves.';

-- Extended booking / portal rules per business (columns on public.businesses).

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS max_bookings_per_week_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_bookings_per_week INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_bookings_per_month_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_bookings_per_month INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS prevent_same_day_multiple_bookings BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS min_notice_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS min_notice_hours INT NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS max_future_booking_days_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_future_booking_days INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS buffer_between_bookings_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buffer_between_bookings_minutes INT NOT NULL DEFAULT 15;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS allow_customer_cancellations BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS cancellation_deadline_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancellation_deadline_hours INT NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS late_cancellation_notice_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS auto_mark_no_show_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.businesses.auto_mark_no_show_enabled IS
  'When true, intended for automation to mark missed appointments as no_show. No cron ships with the app — implement via Supabase Edge scheduled job or external worker.';

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS require_account_to_book BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS require_email_verification_to_book BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.businesses.require_email_verification_to_book IS
  'When true, portal booking requires Supabase auth user.email_confirmed_at.';

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS block_after_no_shows_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS block_after_no_shows_count INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS block_after_cancellations_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS block_after_cancellations_count INT NOT NULL DEFAULT 5;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS show_remaining_slots_to_customers BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_booking_policy_at_checkout BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_cancellation_policy_at_checkout BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_customer_reschedule BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_same_day_bookings BOOLEAN NOT NULL DEFAULT TRUE;

-- Data checks (idempotent if re-run: skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_max_bookings_per_week_bounds'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_max_bookings_per_week_bounds
      CHECK (max_bookings_per_week >= 1 AND max_bookings_per_week <= 500);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_max_bookings_per_month_bounds'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_max_bookings_per_month_bounds
      CHECK (max_bookings_per_month >= 1 AND max_bookings_per_month <= 2000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_min_notice_hours_bounds') THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_min_notice_hours_bounds
      CHECK (min_notice_hours >= 0 AND min_notice_hours <= 8760);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_max_future_booking_days_bounds') THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_max_future_booking_days_bounds
      CHECK (max_future_booking_days >= 1 AND max_future_booking_days <= 730);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_buffer_between_minutes_bounds') THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_buffer_between_minutes_bounds
      CHECK (buffer_between_bookings_minutes >= 0 AND buffer_between_bookings_minutes <= 480);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_cancellation_deadline_hours_bounds') THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_cancellation_deadline_hours_bounds
      CHECK (cancellation_deadline_hours >= 0 AND cancellation_deadline_hours <= 8760);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_block_no_shows_count_bounds') THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_block_no_shows_count_bounds
      CHECK (block_after_no_shows_count >= 1 AND block_after_no_shows_count <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_block_cancellations_count_bounds') THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_block_cancellations_count_bounds
      CHECK (block_after_cancellations_count >= 1 AND block_after_cancellations_count <= 500);
  END IF;
END $$;

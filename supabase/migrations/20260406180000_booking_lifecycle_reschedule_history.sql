-- Booking lifecycle: expand status values + status_changed_at
-- Reschedule: immutable history rows (active booking keeps pending/confirmed after a move)

-- 1) Status CHECK (replace constraint in place; existing rows remain valid)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check CHECK (
    status IN (
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled'
    )
  );

-- 2) When a booking moves to a new slot, the row should return to pending/confirmed (see app logic).
--    Value 'rescheduled' is reserved for rare cases (imports, automation) — not used as steady state after manager reschedule.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.bookings SET status_changed_at = COALESCE(updated_at, created_at, NOW()) WHERE true;

CREATE OR REPLACE FUNCTION public.touch_booking_status_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_status_changed_at ON public.bookings;
CREATE TRIGGER bookings_status_changed_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_booking_status_changed_at();

-- 3) Reschedule audit trail (narrow; complements future Pro audit_log)
CREATE TABLE public.booking_reschedule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  previous_booking_date DATE NOT NULL,
  previous_start_time TIME NOT NULL,
  previous_end_time TIME NOT NULL,
  new_booking_date DATE NOT NULL,
  new_start_time TIME NOT NULL,
  new_end_time TIME NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reschedule_history_booking ON public.booking_reschedule_history (booking_id);
CREATE INDEX idx_reschedule_history_business_created ON public.booking_reschedule_history (business_id, created_at DESC);

ALTER TABLE public.booking_reschedule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY reschedule_history_select_manager ON public.booking_reschedule_history
  FOR SELECT USING (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

CREATE POLICY reschedule_history_insert_manager ON public.booking_reschedule_history
  FOR INSERT WITH CHECK (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

CREATE POLICY reschedule_history_delete_manager ON public.booking_reschedule_history
  FOR DELETE USING (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

COMMENT ON TABLE public.booking_reschedule_history IS 'Prior slot snapshots when a booking is moved; active row holds current schedule.';
COMMENT ON COLUMN public.bookings.status_changed_at IS 'Last time status value changed; maintained by trigger.';

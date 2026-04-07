-- Additive workflow upgrade for training businesses:
-- 1) per-customer internal notes (scoped to business membership)
-- 2) lesson reports tied to completed bookings

ALTER TABLE public.business_users
  ADD COLUMN IF NOT EXISTS internal_note TEXT;

CREATE TABLE IF NOT EXISTS public.lesson_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  written_by_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  notes TEXT NOT NULL,
  topics_covered TEXT[] NOT NULL DEFAULT '{}',
  next_focus TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_reports_booking_unique UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_reports_business_customer
  ON public.lesson_reports (business_id, customer_user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_reports_booking
  ON public.lesson_reports (booking_id);

ALTER TABLE public.lesson_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_reports_select_scope ON public.lesson_reports
  FOR SELECT USING (
    business_id IN (SELECT public.manager_business_ids())
    OR customer_user_id = auth.uid()
    OR public.is_platform_super_admin()
  );

CREATE POLICY lesson_reports_insert_manager ON public.lesson_reports
  FOR INSERT WITH CHECK (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

CREATE POLICY lesson_reports_update_manager ON public.lesson_reports
  FOR UPDATE USING (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

CREATE POLICY lesson_reports_delete_manager ON public.lesson_reports
  FOR DELETE USING (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

COMMENT ON TABLE public.lesson_reports IS 'Instructor completion reports for lessons/bookings.';
COMMENT ON COLUMN public.business_users.internal_note IS 'Manager-only long-lived note for a customer in a specific business.';

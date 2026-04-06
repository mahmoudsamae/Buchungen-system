-- Services catalog per business
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 480),
  price NUMERIC(10, 2),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_business_active ON public.services (business_id, is_active);

CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY services_select_member ON public.services
  FOR SELECT USING (
    business_id IN (SELECT public.active_membership_business_ids())
    OR public.is_platform_super_admin()
  );

CREATE POLICY services_all_manager_or_admin ON public.services
  FOR ALL USING (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

-- Link bookings to a concrete service (nullable for legacy rows)
ALTER TABLE public.bookings
  ADD COLUMN service_id UUID REFERENCES public.services (id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_business_service ON public.bookings (business_id, service_id);

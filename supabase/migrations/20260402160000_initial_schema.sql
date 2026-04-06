-- BookFlow multi-tenant SaaS — initial schema
-- Run in Supabase SQL Editor or via CLI. UUIDs + FKs + RLS.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users; email mirrored for convenient RLS-safe reads)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  is_platform_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_email_key UNIQUE (email)
);

CREATE INDEX idx_profiles_email ON public.profiles (email);

-- ---------------------------------------------------------------------------
-- Businesses (tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  slot_duration_minutes INT NOT NULL DEFAULT 30
    CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 480),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  booking_policy TEXT,
  auto_confirm_bookings BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT businesses_slug_key UNIQUE (slug)
);

CREATE INDEX idx_businesses_status ON public.businesses (status);

-- ---------------------------------------------------------------------------
-- Membership: user ↔ business with per-tenant role & status
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'customer', 'staff')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_users_business_user_key UNIQUE (business_id, user_id)
);

CREATE INDEX idx_business_users_user ON public.business_users (user_id);
CREATE INDEX idx_business_users_business_role ON public.business_users (business_id, role);

-- ---------------------------------------------------------------------------
-- Availability windows (weekday + local time range)
-- weekday: 0 = Sunday ... 6 = Saturday (JavaScript Date.getDay())
-- ---------------------------------------------------------------------------
CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_rules_time_order CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_business_weekday ON public.availability_rules (business_id, weekday)
  WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- Bookings (no service_id — MVP is slot-based)
-- ---------------------------------------------------------------------------
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  created_by_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_time_order CHECK (start_time < end_time)
);

CREATE INDEX idx_bookings_business_date ON public.bookings (business_id, booking_date);
CREATE INDEX idx_bookings_customer ON public.bookings (customer_user_id);
CREATE INDEX idx_bookings_status ON public.bookings (business_id, status);

-- ---------------------------------------------------------------------------
-- Trigger: new auth user → profile row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Keep profile email in sync when auth email changes
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email, updated_at = NOW() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_email_update();

-- ---------------------------------------------------------------------------
-- updated_at touch helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();
CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();
CREATE TRIGGER business_users_updated_at BEFORE UPDATE ON public.business_users
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();
CREATE TRIGGER availability_rules_updated_at BEFORE UPDATE ON public.availability_rules
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RBAC helpers (SECURITY DEFINER; expose minimal surface)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_platform_super_admin FROM public.profiles p WHERE p.id = auth.uid()),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.manager_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu.business_id
  FROM public.business_users bu
  WHERE bu.user_id = auth.uid()
    AND bu.role = 'manager'
    AND bu.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.active_membership_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu.business_id
  FROM public.business_users bu
  WHERE bu.user_id = auth.uid()
    AND bu.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.customer_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu.business_id
  FROM public.business_users bu
  WHERE bu.user_id = auth.uid()
    AND bu.role = 'customer'
    AND bu.status = 'active';
$$;

-- True if current user is an active customer of the given business
CREATE OR REPLACE FUNCTION public.is_customer_of(b_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.business_id = b_id
      AND bu.user_id = auth.uid()
      AND bu.role = 'customer'
      AND bu.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_platform_super_admin());
CREATE POLICY profiles_update_self_or_admin ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_platform_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_platform_super_admin());
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT WITH CHECK (public.is_platform_super_admin());

-- Allow managers to read profiles of users in their business (for customer roster)
CREATE POLICY profiles_select_manager_roster ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.user_id = public.profiles.id
        AND bu.business_id IN (SELECT public.manager_business_ids())
    )
  );

-- Businesses
CREATE POLICY businesses_select_member_or_admin ON public.businesses
  FOR SELECT USING (
    id IN (SELECT public.active_membership_business_ids())
    OR public.is_platform_super_admin()
  );
CREATE POLICY businesses_update_manager_or_admin ON public.businesses
  FOR UPDATE USING (
    id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );
CREATE POLICY businesses_insert_admin ON public.businesses
  FOR INSERT WITH CHECK (public.is_platform_super_admin());
CREATE POLICY businesses_delete_admin ON public.businesses
  FOR DELETE USING (public.is_platform_super_admin());

-- Business users
CREATE POLICY business_users_select_own_or_manager_or_admin ON public.business_users
  FOR SELECT USING (
    user_id = auth.uid()
    OR business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );
CREATE POLICY business_users_insert_manager_or_admin ON public.business_users
  FOR INSERT WITH CHECK (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );
CREATE POLICY business_users_update_manager_or_admin ON public.business_users
  FOR UPDATE USING (
    business_id IN (SELECT public.manager_business_ids())
    OR user_id = auth.uid()
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    business_id IN (SELECT public.manager_business_ids())
    OR user_id = auth.uid()
    OR public.is_platform_super_admin()
  );
CREATE POLICY business_users_delete_manager_or_admin ON public.business_users
  FOR DELETE USING (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

-- Availability
CREATE POLICY availability_select_member ON public.availability_rules
  FOR SELECT USING (business_id IN (SELECT public.active_membership_business_ids()) OR public.is_platform_super_admin());
CREATE POLICY availability_all_manager_or_admin ON public.availability_rules
  FOR ALL USING (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

-- Bookings
CREATE POLICY bookings_select_scope ON public.bookings
  FOR SELECT USING (
    customer_user_id = auth.uid()
    OR business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );
CREATE POLICY bookings_insert_customer ON public.bookings
  FOR INSERT WITH CHECK (
    business_id IN (SELECT public.customer_business_ids())
    AND customer_user_id = auth.uid()
    AND (created_by_user_id IS NULL OR created_by_user_id = auth.uid())
  );

CREATE POLICY bookings_insert_manager ON public.bookings
  FOR INSERT WITH CHECK (
    business_id IN (SELECT public.manager_business_ids())
    AND EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = business_id
        AND bu.user_id = customer_user_id
        AND bu.role = 'customer'
        AND bu.status = 'active'
    )
    AND (created_by_user_id = auth.uid() OR created_by_user_id IS NULL)
  );

CREATE POLICY bookings_update_scope ON public.bookings
  FOR UPDATE USING (
    (customer_user_id = auth.uid() AND business_id IN (SELECT public.customer_business_ids()))
    OR business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    (customer_user_id = auth.uid() AND business_id IN (SELECT public.customer_business_ids()))
    OR business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );
CREATE POLICY bookings_delete_manager_or_admin ON public.bookings
  FOR DELETE USING (
    business_id IN (SELECT public.manager_business_ids())
    OR public.is_platform_super_admin()
  );

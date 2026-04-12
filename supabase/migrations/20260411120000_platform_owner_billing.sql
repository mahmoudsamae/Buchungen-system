-- Platform owner billing & revenue tracking (BookFlow SaaS layer)
-- Run via Supabase CLI or SQL editor. Service-role API bypasses RLS.

CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'free'
    CHECK (plan_code IN ('free', 'basic', 'pro')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  price_cents integer NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS business_subscriptions_status_idx ON public.business_subscriptions (status);
CREATE INDEX IF NOT EXISTS business_subscriptions_plan_idx ON public.business_subscriptions (plan_code);

COMMENT ON TABLE public.business_subscriptions IS 'Per-tenant SaaS plan; one row per school (business).';

-- Optional ledger for revenue-over-time charts (Stripe webhooks / manual entries)
CREATE TABLE IF NOT EXISTS public.platform_revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses (id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  event_type text NOT NULL DEFAULT 'subscription'
    CHECK (event_type IN ('subscription', 'one_time', 'adjustment')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  description text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_revenue_events_occurred_idx ON public.platform_revenue_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_revenue_events_business_idx ON public.platform_revenue_events (business_id);

COMMENT ON TABLE public.platform_revenue_events IS 'Cash-basis revenue events for platform analytics.';

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue_events ENABLE ROW LEVEL SECURITY;

-- Backfill free tier for existing businesses
INSERT INTO public.business_subscriptions (business_id, plan_code, status, price_cents, billing_cycle)
SELECT b.id, 'free', 'active', 0, 'monthly'
FROM public.businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_subscriptions s WHERE s.business_id = b.id
);

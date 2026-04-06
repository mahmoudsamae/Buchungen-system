-- Manual booking / provenance: distinguish manager-created vs customer portal.
-- internal_note: manager-only; customer portal keeps using public.notes for customer-visible text.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_source TEXT NOT NULL DEFAULT 'legacy'
    CONSTRAINT bookings_booking_source_check CHECK (booking_source IN ('legacy', 'portal', 'manual'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS internal_note TEXT;

COMMENT ON COLUMN public.bookings.booking_source IS 'How the booking was created: legacy (pre-migration), portal (customer), manual (manager).';
COMMENT ON COLUMN public.bookings.internal_note IS 'Business-internal note; not shown on customer portal by default.';

CREATE INDEX IF NOT EXISTS idx_bookings_business_source ON public.bookings (business_id, booking_source);

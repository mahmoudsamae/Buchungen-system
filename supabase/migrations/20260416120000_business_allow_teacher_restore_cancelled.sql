-- School-level toggle: teachers may restore cancelled bookings to confirmed (when product rules allow).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS allow_teachers_to_restore_cancelled_bookings boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.allow_teachers_to_restore_cancelled_bookings IS
  'When true, teachers may reactivate eligible cancelled_by_* bookings as confirmed from the teacher app.';

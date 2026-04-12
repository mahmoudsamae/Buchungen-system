-- Align `bookings.booking_source` with application enums and `bookings_booking_source_check`.
-- Allowed: portal, teacher_manual, student_direct, student_request

UPDATE public.bookings
SET booking_source = 'student_direct'
WHERE booking_source = 'student_portal';

UPDATE public.bookings
SET booking_source = 'teacher_manual'
WHERE booking_source = 'manual';

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_source_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_source_check
  CHECK (booking_source IN (
    'portal',
    'teacher_manual',
    'student_direct',
    'student_request'
  ));

-- Per-teacher booking policy (one row per teacher per school).
CREATE TABLE IF NOT EXISTS teacher_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL,
  instant_booking_enabled boolean NOT NULL DEFAULT true,
  max_bookings_per_student_per_day integer NOT NULL DEFAULT 1,
  max_bookings_per_student_per_week integer NOT NULL DEFAULT 2,
  minimum_hours_before_booking numeric(6, 2) NOT NULL DEFAULT 12,
  booking_window_days integer NOT NULL DEFAULT 14,
  allow_multiple_future_bookings boolean NOT NULL DEFAULT true,
  default_lesson_duration_minutes integer NOT NULL DEFAULT 60,
  break_between_lessons_minutes integer NOT NULL DEFAULT 0,
  weekly_recurring_availability_enabled boolean NOT NULL DEFAULT true,
  auto_generate_slots_enabled boolean NOT NULL DEFAULT false,
  same_day_booking_enabled boolean NOT NULL DEFAULT true,
  only_assigned_students_can_book boolean NOT NULL DEFAULT true,
  only_active_students_can_book boolean NOT NULL DEFAULT true,
  students_can_reschedule_their_own_bookings boolean NOT NULL DEFAULT true,
  students_can_cancel_their_own_bookings boolean NOT NULL DEFAULT true,
  minimum_hours_before_cancellation numeric(6, 2) NOT NULL DEFAULT 24,
  minimum_hours_before_reschedule numeric(6, 2) NOT NULL DEFAULT 24,
  notify_on_new_booking boolean NOT NULL DEFAULT true,
  notify_on_booking_cancellation boolean NOT NULL DEFAULT true,
  reminder_before_lesson_minutes integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_settings_one_per_teacher UNIQUE (business_id, teacher_user_id),
  CONSTRAINT teacher_settings_max_day CHECK (max_bookings_per_student_per_day >= 1 AND max_bookings_per_student_per_day <= 50),
  CONSTRAINT teacher_settings_max_week CHECK (max_bookings_per_student_per_week >= 1 AND max_bookings_per_student_per_week <= 100),
  CONSTRAINT teacher_settings_min_notice CHECK (minimum_hours_before_booking >= 0 AND minimum_hours_before_booking <= 168),
  CONSTRAINT teacher_settings_window CHECK (booking_window_days >= 1 AND booking_window_days <= 365),
  CONSTRAINT teacher_settings_duration CHECK (default_lesson_duration_minutes IN (45, 60, 90, 120)),
  CONSTRAINT teacher_settings_break CHECK (break_between_lessons_minutes IN (0, 10, 15, 30)),
  CONSTRAINT teacher_settings_reminder CHECK (reminder_before_lesson_minutes IN (15, 30, 60))
);

CREATE INDEX IF NOT EXISTS idx_teacher_settings_business_teacher ON teacher_settings (business_id, teacher_user_id);

COMMENT ON TABLE teacher_settings IS 'Driving-school teacher booking policies; merged with code defaults when row missing.';

CREATE OR REPLACE FUNCTION trg_teacher_settings_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teacher_settings_updated_at ON teacher_settings;
CREATE TRIGGER teacher_settings_updated_at
  BEFORE UPDATE ON teacher_settings
  FOR EACH ROW EXECUTE PROCEDURE trg_teacher_settings_touch_updated_at();

ALTER TABLE teacher_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_settings_select_own ON teacher_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = teacher_settings.business_id
        AND bu.user_id = auth.uid()
        AND bu.role = 'staff'
    )
    AND teacher_settings.teacher_user_id = auth.uid()
  );

CREATE POLICY teacher_settings_insert_own ON teacher_settings
  FOR INSERT WITH CHECK (
    teacher_settings.teacher_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = teacher_settings.business_id
        AND bu.user_id = auth.uid()
        AND bu.role = 'staff'
    )
  );

CREATE POLICY teacher_settings_update_own ON teacher_settings
  FOR UPDATE USING (
    teacher_settings.teacher_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = teacher_settings.business_id
        AND bu.user_id = auth.uid()
        AND bu.role = 'staff'
    )
  );

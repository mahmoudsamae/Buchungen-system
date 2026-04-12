-- Per-instructor weekly windows and date overrides (school tenant + staff user).
-- App enforces access via guardStaffJson; add RLS policies in a follow-up if using anon key on these tables.

CREATE TABLE IF NOT EXISTS teacher_availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_avail_rules_business_staff ON teacher_availability_rules (business_id, staff_user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_avail_rules_weekday ON teacher_availability_rules (business_id, staff_user_id, weekday);

CREATE TABLE IF NOT EXISTS teacher_availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  override_date date NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_avail_ov_business_staff_date ON teacher_availability_overrides (business_id, staff_user_id, override_date);

COMMENT ON TABLE teacher_availability_rules IS 'Weekly bookable windows for a staff (teacher) within a business.';
COMMENT ON TABLE teacher_availability_overrides IS 'Per-date closures or custom windows for a teacher (is_closed=true blocks the day).';

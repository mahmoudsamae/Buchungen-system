-- Extend per-teacher availability for production scheduling (metadata + validity + dedup).

ALTER TABLE teacher_availability_rules
  ADD COLUMN IF NOT EXISTS slot_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS buffer_minutes integer,
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN teacher_availability_rules.slot_duration_minutes IS 'Optional: duration used when this row was generated from the slot generator (each row is still one bookable block).';
COMMENT ON COLUMN teacher_availability_rules.buffer_minutes IS 'Optional: buffer used in generator between consecutive blocks.';
COMMENT ON COLUMN teacher_availability_rules.valid_from IS 'If set, this weekly rule applies only on/after this calendar date.';
COMMENT ON COLUMN teacher_availability_rules.valid_until IS 'If set, this weekly rule applies only on/before this calendar date.';

ALTER TABLE teacher_availability_overrides
  ADD COLUMN IF NOT EXISTS note text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_avail_rules_active_dedup
  ON teacher_availability_rules (business_id, staff_user_id, weekday, start_time, end_time)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION trg_teacher_avail_rules_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teacher_avail_rules_updated_at ON teacher_availability_rules;
CREATE TRIGGER teacher_avail_rules_updated_at
  BEFORE UPDATE ON teacher_availability_rules
  FOR EACH ROW EXECUTE PROCEDURE trg_teacher_avail_rules_touch_updated_at();

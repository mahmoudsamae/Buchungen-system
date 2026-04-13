-- =============================================================================
-- DEV / TEST ONLY — FULL APPLICATION DATA RESET (DESTRUCTIVE)
-- =============================================================================
-- Removes ALL runtime data for this BookFlow app so you can bootstrap again.
--
-- What is DELETED:
--   • All business tenant data: businesses, business_users, bookings, services,
--     training_categories, availability_rules, availability_date_overrides,
--     booking_reschedule_history, lesson_reports, student_notes
--   • All public.profiles rows (platform + managers + customers)
--   • All auth.users (and dependent auth rows via FK cascade)
--
-- What is NOT touched:
--   • Schema, migrations, RLS policies, extensions
--   • This repository / codebase
--
-- Run in Supabase SQL Editor (postgres role) OR: psql $DATABASE_URL -f supabase/scripts/DEV_FULL_RESET.sql
--
-- After running: create a new Auth user (sign up) and run your platform-owner
-- bootstrap flow (e.g. claim-first-owner) as documented in the app.
-- =============================================================================

BEGIN;

-- 1) Child tables first (FK order)
DELETE FROM booking_reschedule_history;
DELETE FROM lesson_reports;
DELETE FROM bookings;
DELETE FROM student_notes;
DELETE FROM teacher_availability_overrides;
DELETE FROM teacher_availability_rules;
DELETE FROM availability_date_overrides;
DELETE FROM availability_rules;
DELETE FROM teacher_settings;
DELETE FROM teacher_staff_extensions;
DELETE FROM teacher_services;
DELETE FROM services;
DELETE FROM business_users;
DELETE FROM training_categories;
DELETE FROM businesses;

-- 2) Profile rows (1:1 with auth users). Delete before auth.users if your FK
--    requires child rows removed first; safe when business_users is already empty.
DELETE FROM public.profiles;

-- 3) Auth identities (all logins). Requires postgres / dashboard SQL privileges.
DELETE FROM auth.users;

COMMIT;

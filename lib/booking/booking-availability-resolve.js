import { resolveAvailabilityWindowsForDate } from "@/lib/booking/final-availability";
import {
  intersectWindows,
  resolveTeacherWindowsForDate,
  teacherHasConfiguredAvailability
} from "@/lib/booking/teacher-availability-windows";

/**
 * Business-level availability intersected with per-teacher weekly rules + overrides when the
 * student has a primary instructor and that instructor has configured availability.
 *
 * @param {{
 *   supabase: import("@supabase/supabase-js").SupabaseClient,
 *   businessId: string,
 *   date: string,
 *   categoryId: string | null | undefined,
 *   primaryInstructorUserId: string | null | undefined
 * }} args
 */
export async function resolveBookingAvailabilityWindows({
  supabase,
  businessId,
  date,
  categoryId,
  primaryInstructorUserId
}) {
  const business = await resolveAvailabilityWindowsForDate({
    supabase,
    businessId,
    date,
    categoryId
  });

  if (business.mode === "closed") {
    return { mode: "closed", windows: [], source: business.source || "business_closed" };
  }

  const bizW = business.windows || [];
  if (!primaryInstructorUserId) {
    return { mode: "open", windows: bizW, source: business.source || "weekly_rules" };
  }

  const configured = await teacherHasConfiguredAvailability(supabase, businessId, primaryInstructorUserId);
  if (!configured) {
    return { mode: "open", windows: bizW, source: business.source || "weekly_rules" };
  }

  const teacher = await resolveTeacherWindowsForDate({
    supabase,
    businessId,
    teacherUserId: primaryInstructorUserId,
    dateStr: String(date).slice(0, 10)
  });

  if (teacher.mode === "closed") {
    return { mode: "closed", windows: [], source: "teacher_closed" };
  }

  const tw = teacher.windows || [];
  // Empty business windows mean the school did not define weekly hours for this weekday.
  // Intersecting [] with teacher windows always yields [] (outer loop is over business rows),
  // which would incorrectly hide the teacher's schedule. Use teacher-only windows in that case.
  const merged =
    !bizW.length && tw.length ? tw : intersectWindows(bizW, tw);
  if (!merged.length) {
    return { mode: "closed", windows: [], source: "intersection_empty" };
  }

  return {
    mode: "open",
    windows: merged,
    source: !bizW.length && tw.length ? "teacher_only" : "combined"
  };
}

import { weekdayFromCalendarDateString } from "@/lib/booking/final-availability";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/teacher/slot-generator";

function hhmm(t) {
  return String(t || "").slice(0, 5);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function teacherHasConfiguredAvailability(supabase, businessId, teacherUserId) {
  const { count: rc, error: re } = await supabase
    .from("teacher_availability_rules")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("staff_user_id", teacherUserId);
  if (re && re.code !== "42P01") {
    console.error("[teacherHasConfiguredAvailability]", re.message);
  }
  if ((rc || 0) > 0) return true;

  const { count: oc, error: oe } = await supabase
    .from("teacher_availability_overrides")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("staff_user_id", teacherUserId);
  if (oe && oe.code !== "42P01") {
    console.error("[teacherHasConfiguredAvailability] overrides", oe.message);
  }
  return (oc || 0) > 0;
}

/**
 * Weekly rules + per-date overrides for one teacher.
 *
 * @returns {Promise<{ mode: "closed", windows: [] } | { mode: "open", windows: { start_time: string, end_time: string }[] }>}
 */
export async function resolveTeacherWindowsForDate({ supabase, businessId, teacherUserId, dateStr }) {
  const d = String(dateStr || "").slice(0, 10);

  const { data: ovs, error: oe } = await supabase
    .from("teacher_availability_overrides")
    .select("id, is_closed, start_time, end_time, is_active")
    .eq("business_id", businessId)
    .eq("staff_user_id", teacherUserId)
    .eq("override_date", d)
    .eq("is_active", true);

  if (oe && oe.code !== "42P01") {
    console.error("[resolveTeacherWindowsForDate] overrides", oe.message);
  }

  const activeOvs = Array.isArray(ovs) ? ovs : [];
  if (activeOvs.some((o) => o.is_closed)) {
    return { mode: "closed", windows: [] };
  }

  const custom = activeOvs.find((o) => !o.is_closed && o.start_time && o.end_time);
  if (custom) {
    const s = hhmm(custom.start_time);
    const e = hhmm(custom.end_time);
    if (s && e && s < e) {
      return { mode: "open", windows: [{ start_time: s, end_time: e }] };
    }
    return { mode: "closed", windows: [] };
  }

  const weekday = weekdayFromCalendarDateString(d);

  const { data: rules, error: re } = await supabase
    .from("teacher_availability_rules")
    .select("start_time, end_time, is_active, valid_from, valid_until")
    .eq("business_id", businessId)
    .eq("staff_user_id", teacherUserId)
    .eq("weekday", weekday)
    .eq("is_active", true);

  if (re) {
    if (re.code === "42P01") return { mode: "open", windows: [] };
    console.error("[resolveTeacherWindowsForDate] rules", re.message);
    return { mode: "open", windows: [] };
  }

  const windows = (rules || [])
    .filter((r) => {
      const vf = r.valid_from != null ? String(r.valid_from).slice(0, 10) : null;
      const vu = r.valid_until != null ? String(r.valid_until).slice(0, 10) : null;
      if (vf && d < vf) return false;
      if (vu && d > vu) return false;
      return true;
    })
    .map((r) => ({
      start_time: hhmm(r.start_time),
      end_time: hhmm(r.end_time)
    }))
    .filter((w) => w.start_time && w.end_time && w.start_time < w.end_time);

  return { mode: "open", windows };
}

/**
 * Intersect two sets of same-day windows (HH:MM strings).
 * @param {{ start_time: string, end_time: string }[]} businessWindows
 * @param {{ start_time: string, end_time: string }[]} teacherWindows
 */
export function intersectWindows(businessWindows, teacherWindows) {
  const B = businessWindows || [];
  const T = teacherWindows || [];
  const out = [];
  for (const b of B) {
    const bs = hhmmToMinutes(b.start_time);
    const be = hhmmToMinutes(b.end_time);
    if (bs == null || be == null || bs >= be) continue;
    for (const t of T) {
      const ts = hhmmToMinutes(t.start_time);
      const te = hhmmToMinutes(t.end_time);
      if (ts == null || te == null || ts >= te) continue;
      const s = Math.max(bs, ts);
      const e = Math.min(be, te);
      if (s < e) {
        const st = minutesToHHMM(s);
        const en = minutesToHHMM(e);
        if (st && en) out.push({ start_time: st, end_time: en });
      }
    }
  }
  out.sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time));
  return dedupeWindows(out);
}

function dedupeWindows(windows) {
  const seen = new Set();
  const out = [];
  for (const w of windows) {
    const k = `${w.start_time}-${w.end_time}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out;
}

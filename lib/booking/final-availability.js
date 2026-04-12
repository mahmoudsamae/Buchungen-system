/**
 * Final availability resolution for a single calendar date.
 *
 * Precedence (per business, date, category scope):
 * 1) If any active override row is_closed=true matches scope => CLOSED (no windows).
 * 2) Else if any active override windows exist (is_closed=false) => use ONLY those windows.
 * 3) Else => fallback to weekly availability_rules for that weekday.
 *
 * Category matching:
 * - categoryId === undefined: NO filter (aka "All categories" in manager preview). Return all scopes.
 * - categoryId is a string: match rows where category_id IS NULL OR = categoryId.
 * - categoryId === null: match only global rows where category_id IS NULL (unassigned customer).
 */

/** Weekday 0–6 for a calendar date string, stable across timezones (noon UTC avoids DST edge cases). */
export function weekdayFromCalendarDateString(dateStr) {
  const parts = String(dateStr || "")
    .split("-")
    .map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function hhmm(t) {
  return String(t || "").slice(0, 5);
}

/**
 * @param {{
 *  supabase: any,
 *  businessId: string,
 *  date: string, // YYYY-MM-DD
 *  categoryId: string | null | undefined,
 * }} args
 * @returns {Promise<
 *  | { mode: "closed", windows: [], source: "override_closed" }
 *  | { mode: "open", windows: { start_time: string, end_time: string }[], source: "override_windows" | "weekly_rules" }
 * >}
 */
export async function resolveAvailabilityWindowsForDate({ supabase, businessId, date, categoryId }) {
  const dateStr = String(date || "").slice(0, 10);
  const hasNoCategoryFilter = categoryId === undefined;
  const customerCategoryId = typeof categoryId === "string" && categoryId ? categoryId : null;

  // 1) Try date overrides first
  let overridesQuery = supabase
    .from("availability_date_overrides")
    .select("id, start_time, end_time, is_closed, category_id, is_active")
    .eq("business_id", businessId)
    .eq("date", dateStr)
    .eq("is_active", true)
    .order("start_time", { ascending: true, nullsFirst: true });

  if (!hasNoCategoryFilter) {
    if (customerCategoryId) {
      overridesQuery = overridesQuery.or(`category_id.is.null,category_id.eq.${customerCategoryId}`);
    } else {
      overridesQuery = overridesQuery.is("category_id", null);
    }
  }

  const { data: overrides, error: oe } = await overridesQuery;
  if (oe) {
    // Fail-safe: if overrides table exists but query fails, do not silently hide all slots.
    console.error("[resolveAvailabilityWindowsForDate] overrides query failed", oe.code || "", oe.message);
  }

  const activeOverrides = Array.isArray(overrides) ? overrides : [];
  // When category filtering is disabled (manager "All categories"), only a GLOBAL closure (category_id NULL)
  // closes the whole day. Category-specific closures are respected only when filtering for that category.
  const hasClosure = hasNoCategoryFilter
    ? activeOverrides.some((o) => Boolean(o.is_closed) && (o.category_id == null || o.category_id === ""))
    : activeOverrides.some((o) => Boolean(o.is_closed));
  if (hasClosure) {
    return { mode: "closed", windows: [], source: "override_closed" };
  }

  const overrideWindows = activeOverrides
    .filter((o) => !o.is_closed && o.start_time && o.end_time)
    .map((o) => ({ start_time: hhmm(o.start_time), end_time: hhmm(o.end_time) }))
    .filter((w) => w.start_time && w.end_time && w.start_time < w.end_time);

  if (overrideWindows.length > 0) {
    return { mode: "open", windows: overrideWindows, source: "override_windows" };
  }

  // 2) Fallback to weekly rules
  const weekday = weekdayFromCalendarDateString(dateStr);

  let rulesQuery = supabase
    .from("availability_rules")
    .select("weekday, start_time, end_time, is_active, category_id")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .eq("weekday", weekday)
    .order("start_time");

  if (!hasNoCategoryFilter) {
    if (customerCategoryId) {
      rulesQuery = rulesQuery.or(`category_id.is.null,category_id.eq.${customerCategoryId}`);
    } else {
      rulesQuery = rulesQuery.is("category_id", null);
    }
  }

  const { data: rules, error: re } = await rulesQuery;
  if (re) {
    console.error("[resolveAvailabilityWindowsForDate] weekly rules query failed", re.code || "", re.message);
    return { mode: "open", windows: [], source: "weekly_rules" };
  }

  const weeklyWindows = (rules || [])
    .map((r) => ({ start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) }))
    .filter((w) => w.start_time && w.end_time && w.start_time < w.end_time);

  return { mode: "open", windows: weeklyWindows, source: "weekly_rules" };
}


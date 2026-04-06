/** @param {string} hhmm "HH:MM" or "HH:MM:SS" */
export function addMinutesToTime(hhmm, minutes) {
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  if (nh >= 24) return null;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Earlier time same day; clamps to 00:00 (for buffer expansion on a single calendar day). */
export function subtractMinutesToTime(hhmm, minutes) {
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  let total = h * 60 + m - Number(minutes);
  if (total < 0) total = 0;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Add minutes; clamp end-of-day to 23:59 (single-day slot grids). */
export function addMinutesToTimeClampDay(hhmm, minutes) {
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  let total = Math.min(h * 60 + m + Number(minutes), 24 * 60 - 1);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Minutes since midnight from time string. */
export function timeToMinutes(t) {
  const parts = String(t).split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  const s = Number(parts[2] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m + s / 60;
}

/**
 * Half-open intervals [start, end) in minutes — adjacent schedules do not overlap.
 * @returns {boolean}
 */
export function timesOverlapHalfOpenMinutes(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export function sqlTimeFromHHMM(hhmm) {
  const base = String(hhmm).slice(0, 5);
  return `${base}:00`;
}

import { addMinutesToTimeClampDay, subtractMinutesToTime } from "@/lib/manager/booking-time";

/**
 * Widen occupied intervals on a single calendar day for buffer-aware slot hiding.
 * @param {{ start_time: string, end_time: string }[]} bookedRanges
 * @param {number} bufferMinutes
 */
export function expandBookedRangesForBuffer(bookedRanges, bufferMinutes) {
  const buf = Number(bufferMinutes) || 0;
  if (buf <= 0) return bookedRanges;
  return bookedRanges.map((b) => {
    const s = String(b.start_time).slice(0, 5);
    const e = String(b.end_time).slice(0, 5);
    const startRaw = subtractMinutesToTime(s, buf) || "00:00";
    const endRaw = addMinutesToTimeClampDay(e, buf) || e;
    return { start_time: startRaw, end_time: endRaw };
  });
}

/**
 * Compute bookable slots for a calendar date from availability rules + slot duration.
 * Each slot is a contiguous [start, end) window expressed as "HH:MM" strings.
 *
 * Window semantics: a slot fits in [rule.start_time, rule.end_time] if the slot ends at or
 * before rule.end_time (inclusive end). Using strict "end < ruleEnd" incorrectly drops
 * slots whose end time equals the window end (e.g. 08:00–09:30 with a 90-minute slot).
 *
 * @param {{
 *   weekday: number,
 *   rules: { weekday: number, start_time: string, end_time: string, is_active: boolean }[],
 *   slotDurationMinutes: number,
 *   bookedRanges: { start_time: string, end_time: string }[]
 * }} args
 * @returns {{ start: string, end: string }[]}
 */
export function computeSlotsForDate({ weekday, rules, slotDurationMinutes, bookedRanges }) {
  // IMPORTANT PRODUCT SEMANTICS:
  // - Each availability rule row is a direct bookable block (do not subdivide).
  // - The "Generate slots" feature creates many rows already; those remain discrete blocks.
  // `slotDurationMinutes` is still used elsewhere (booking duration defaults), but NOT to split windows.
  const active = rules.filter((r) => r.is_active && r.weekday === weekday);
  const slotList = [];

  for (const rule of active) {
    const start = String(rule.start_time).slice(0, 5);
    const end = String(rule.end_time).slice(0, 5);
    if (!start || !end || start >= end) continue;
    const overlaps = bookedRanges.some((b) =>
      timeRangesOverlap(start, end, b.start_time.slice(0, 5), b.end_time.slice(0, 5))
    );
    if (!overlaps) slotList.push({ start, end });
  }

  const byKey = new Map();
  for (const s of slotList) {
    const k = `${s.start}-${s.end}`;
    if (!byKey.has(k)) byKey.set(k, s);
  }
  return [...byKey.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

/**
 * Split [dayStart, dayEnd] into contiguous windows of length slotDurationMinutes.
 * Omits a trailing piece that would extend past dayEnd.
 *
 * @param {string} dayStart "HH:MM"
 * @param {string} dayEnd "HH:MM"
 * @param {number} slotDurationMinutes
 * @returns {{ start: string, end: string }[]}
 */
export function generateContiguousSlotWindows(dayStart, dayEnd, slotDurationMinutes) {
  const start = dayStart.slice(0, 5);
  const end = dayEnd.slice(0, 5);
  if (!slotDurationMinutes || slotDurationMinutes < 5) return [];
  const out = [];
  let t = start;
  let guard = 0;
  while (guard++ < 400) {
    const slotEnd = addMinutesToTime(t, slotDurationMinutes);
    if (!slotEnd) break;
    if (isTimeAfter(slotEnd, end)) break;
    out.push({ start: t, end: slotEnd });
    t = slotEnd;
  }
  return out;
}

function addMinutesToTime(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  if (nh >= 24) return null;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function isTimeBefore(a, b) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah < bh || (ah === bh && am < bm);
}

/** Strictly after: a > b */
function isTimeAfter(a, b) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah > bh || (ah === bh && am > bm);
}

function timeRangesOverlap(aStart, aEnd, bStart, bEnd) {
  return isTimeBefore(aStart, bEnd) && isTimeBefore(bStart, aEnd);
}

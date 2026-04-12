import { addMinutesToTime } from "@/lib/manager/booking-time";

/**
 * Compare HH:MM strings on the same calendar day. Returns negative if a < b, 0 if equal, positive if a > b.
 * @param {string} a
 * @param {string} b
 */
export function compareHHMM(a, b) {
  const am = hhmmToMinutes(String(a).slice(0, 5));
  const bm = hhmmToMinutes(String(b).slice(0, 5));
  if (am == null || bm == null) return 0;
  return am - bm;
}

export function hhmmToMinutes(hhmm) {
  const m = String(hhmm || "")
    .slice(0, 8)
    .match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

export function minutesToHHMM(total) {
  if (total == null || !Number.isFinite(total)) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h >= 24) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Contiguous lesson blocks inside [dayStart, dayEnd], with optional idle gap after each block.
 * Omits any block that would end after dayEnd.
 *
 * @param {string} dayStart "HH:MM"
 * @param {string} dayEnd "HH:MM"
 * @param {number} durationMinutes
 * @param {number} [bufferMinutes] idle time after each block before the next start
 * @returns {{ start: string, end: string }[]}
 */
export function generateLessonSlotsWithBuffer(dayStart, dayEnd, durationMinutes, bufferMinutes = 0) {
  const dur = Number(durationMinutes);
  const buf = Math.max(0, Number(bufferMinutes) || 0);
  if (!dur || dur < 5) return [];

  const endLimit = String(dayEnd).slice(0, 5);
  const startLimit = String(dayStart).slice(0, 5);
  if (compareHHMM(startLimit, endLimit) >= 0) return [];

  const out = [];
  let t = startLimit;
  let guard = 0;
  while (guard++ < 400) {
    const slotEnd = addMinutesToTime(t, dur);
    if (!slotEnd) break;
    if (compareHHMM(slotEnd, endLimit) > 0) break;
    out.push({ start: t, end: slotEnd });
    const next = addMinutesToTime(slotEnd, buf);
    if (!next) break;
    if (compareHHMM(next, endLimit) >= 0) break;
    t = next;
  }
  return out;
}

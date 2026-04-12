/** Normalize `[studentId]` route param to a canonical lowercase UUID string. */
export function normalizeStudentIdParam(raw) {
  const s =
    typeof raw === "string"
      ? raw.trim()
      : Array.isArray(raw) && raw[0]
        ? String(raw[0]).trim()
        : "";
  if (!s) return { ok: false, error: "Student id is required.", studentId: null };
  const lower = s.toLowerCase();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lower)
  ) {
    return { ok: false, error: "Invalid student id.", studentId: null };
  }
  return { ok: true, error: null, studentId: lower };
}

/** Stable sort: pinned first, then newest. */
export function sortStudentNotesByPinnedThenDate(notes) {
  return (notes || []).slice().sort((a, b) => {
    const ap = !!a?.is_pinned;
    const bp = !!b?.is_pinned;
    if (ap !== bp) return ap ? -1 : 1;
    const ta = new Date(a?.created_at || 0).getTime();
    const tb = new Date(b?.created_at || 0).getTime();
    return tb - ta;
  });
}

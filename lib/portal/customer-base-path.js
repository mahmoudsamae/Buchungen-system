/**
 * Customer UI lives under `/portal/[slug]` or `/student/[slug]` — API routes stay `/api/portal/[slug]`.
 * @param {string | null | undefined} pathname
 * @param {string} slug
 */
export function customerUiBasePath(pathname, slug) {
  const s = String(slug || "").trim();
  if (!s) return "/portal";
  if (pathname && pathname.startsWith("/student/")) return `/student/${s}`;
  return `/portal/${s}`;
}

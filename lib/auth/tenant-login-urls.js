/** Browser path segments for role-specific login entry (no credentials in URL). */

import { defaultSchoolSlugForLoginRedirects } from "@/lib/auth/default-school-slug";

export function schoolLoginPath(slug) {
  return `/login/school/${encodeURIComponent(String(slug || "").trim())}`;
}

export function teacherLoginPath(slug) {
  return `/login/teacher/${encodeURIComponent(String(slug || "").trim())}`;
}

/** Platform owner / staff console — canonical path; legacy `/super-admin-login` redirects here via `app/internal/login`. */
export function platformOwnerLoginPath() {
  return "/internal/login";
}

/** Marketing / header links when no slug is typed — uses {@link defaultSchoolSlugForLoginRedirects}. */
export function schoolLoginMarketingPath() {
  return schoolLoginPath(defaultSchoolSlugForLoginRedirects());
}

export function teacherLoginMarketingPath() {
  return teacherLoginPath(defaultSchoolSlugForLoginRedirects());
}

export function withOrigin(origin, path) {
  const o = String(origin || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${o}${p}`;
}

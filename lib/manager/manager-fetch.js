import { MANAGER_BUSINESS_SLUG_HEADER } from "@/lib/manager/api-constants";

/**
 * @param {string | undefined | null} businessSlug
 * @param {string} path
 * @param {RequestInit} [init]
 */
export function managerFetch(businessSlug, path, init = {}) {
  const headers = new Headers(init.headers);
  const s = businessSlug != null ? String(businessSlug).trim() : "";
  if (s) headers.set(MANAGER_BUSINESS_SLUG_HEADER, s);
  return fetch(path, { ...init, headers });
}

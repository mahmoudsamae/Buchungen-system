/**
 * Fallback school slug for marketing links and unscoped redirects (middleware, legacy /manager/*).
 * Override with NEXT_PUBLIC_DEMO_BUSINESS_SLUG in .env.local.
 */
export function defaultSchoolSlugForLoginRedirects() {
  return (process.env.NEXT_PUBLIC_DEMO_BUSINESS_SLUG || "bayer-fahrschule").trim();
}

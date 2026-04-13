/**
 * School dashboard — manager workspace (`business_users.role = manager`).
 * Teacher-centric: day-to-day students/bookings/calendar live under each teacher profile.
 * Tenant isolation enforced in API via `guardManagerJson` + `business_id`.
 */
export const managerNav = [
  { href: "/dashboard", labelKey: "manager.nav.overview" },
  { href: "/teachers", labelKey: "manager.nav.teachers" },
  { href: "/services", labelKey: "manager.nav.services" },
  { href: "/analytics", labelKey: "manager.nav.reports" },
  { href: "/settings", labelKey: "manager.nav.settings" }
];

/** Secondary routes (portal, catalog, school hours) — not in main nav; linked from Settings. */
export const managerSetupLinks = [
  { href: "/booking-link", labelKey: "manager.nav.bookingLink" },
  { href: "/availability", labelKey: "manager.nav.availability" },
  { href: "/categories", labelKey: "manager.nav.categories" },
  { href: "/customers", labelKey: "manager.nav.customers" }
];

export const adminNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/businesses", label: "Businesses" },
  { href: "/activity", label: "Platform Activity" },
  { href: "/plans", label: "Plans & Billing" },
  { href: "/settings", label: "Admin Settings" }
];

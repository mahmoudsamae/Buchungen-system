/**
 * Platform role model — single source of intent for permissions.
 * UI and API layers should align with this; Supabase RLS/policies will mirror these rules later.
 */

export const ROLE = {
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  STAFF: "staff",
  CUSTOMER: "customer"
};

/** Capabilities by area (not exhaustive; extend when adding features). */
export const SUP_ADMIN_SCOPE = {
  platform: true,
  businesses: { create: true, read: true, update: true, suspend: true, delete: true },
  /** Platform creates the tenant manager only — not end-customer profiles for each business. */
  tenantManagers: { create: true, read: true, update: true, security: true },
  tenantCustomers: { create: false, read: false, update: false, delete: false },
  tenantBookings: { read: "aggregate_or_support_only" }
};

export const MANAGER_SCOPE = {
  ownBusinessOnly: true,
  customers: {
    create: true,
    read: true,
    update: true,
    setStatus: true,
    delete: true,
    resetPassword: true,
    bookingHistory: true
  },
  bookings: true,
  services: true,
  availability: true,
  /** Internal team: owner (DB role `manager`) + staff — not portal customers. */
  team: { manageStaff: true, ownerReadOnlyDelete: false },
  settings: true
};

export const CUSTOMER_SCOPE = {
  ownProfile: true,
  book: true,
  manageOwnBookings: true
};

/** Super Admin API must not expose or mutate per-tenant customer CRM by default. */
export function shouldExposeTenantCustomersToSuperAdmin() {
  return false;
}

/**
 * Platform role model — single source of intent for permissions.
 * UI and API layers should align with this; Supabase RLS/policies will mirror these rules later.
 *
 * Platform staff lives on `profiles.platform_role` (`platform_owner` | `platform_admin`).
 * Legacy: `profiles.is_platform_super_admin` (treated as platform_admin in app code).
 *
 * Tenant roles live on `business_users.role` (DB: manager | staff | customer).
 * Product naming: school_admin ≈ manager, instructor ≈ staff, student ≈ customer.
 *
 * Driving-school tenant model (aligned with app code):
 * - Each `businesses` row is one school (tenant). Platform owner/admin sit above tenants on `profiles.platform_role`.
 * - Managers, teachers (staff), and students (customers) are **siblings** under the school via `business_users` — students are
 *   not nested under a teacher in the schema.
 * - Optional `business_users.primary_instructor_user_id` on a **student** row is CRM / “primary instructor” preference only;
 *   it does not parent the student under that user and is not written onto bookings.
 * - `bookings` tie **school + student (`customer_user_id`) + service + date/time**; school-wide availability rules apply to
 *   slot generation. There is no `teacher_id` / `staff_id` on booking rows in the current implementation — add a nullable
 *   assignment later if product requires per-instructor schedules without changing existing columns’ meaning.
 */

import { PLATFORM_ROLE } from "./access";

export { PLATFORM_ROLE };

export const ROLE = {
  /** @deprecated use PLATFORM_ROLE + profiles.platform_role; kept for gradual refactors */
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

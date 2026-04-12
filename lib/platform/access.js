/**
 * Platform-level access (above tenant / business scope).
 * Legacy: `profiles.is_platform_super_admin` remains supported until fully retired.
 */

export const PLATFORM_ROLE = {
  OWNER: "platform_owner",
  ADMIN: "platform_admin"
};

/**
 * @param {object | null | undefined} profile Row from `profiles` (subset ok).
 * @returns {{
 *   canAccessPlatformAdmin: boolean,
 *   isPlatformOwner: boolean,
 *   platformRole: string | null,
 *   platformStaffSuspended: boolean
 * }}
 */
export function platformAccessFromProfile(profile) {
  if (!profile) {
    return {
      canAccessPlatformAdmin: false,
      isPlatformOwner: false,
      platformRole: null,
      platformStaffSuspended: false
    };
  }
  const role = profile.platform_role != null ? String(profile.platform_role).trim() : "";
  const normalizedRole = role === "" ? null : role;
  const legacy = Boolean(profile.is_platform_super_admin);
  const suspended = Boolean(profile.platform_staff_suspended);
  const isPlatformOwner = normalizedRole === PLATFORM_ROLE.OWNER;

  if (isPlatformOwner) {
    return {
      canAccessPlatformAdmin: true,
      isPlatformOwner: true,
      platformRole: normalizedRole,
      platformStaffSuspended: false
    };
  }

  const isAdminLevel = normalizedRole === PLATFORM_ROLE.ADMIN || legacy;
  if (!isAdminLevel) {
    return {
      canAccessPlatformAdmin: false,
      isPlatformOwner: false,
      platformRole: normalizedRole,
      platformStaffSuspended: suspended
    };
  }

  if (suspended) {
    return {
      canAccessPlatformAdmin: false,
      isPlatformOwner: false,
      platformRole: normalizedRole,
      platformStaffSuspended: true
    };
  }

  return {
    canAccessPlatformAdmin: true,
    isPlatformOwner: false,
    platformRole: normalizedRole,
    platformStaffSuspended: false
  };
}

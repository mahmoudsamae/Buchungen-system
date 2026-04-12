import { describe, expect, it } from "vitest";
import { PLATFORM_ROLE, platformAccessFromProfile } from "@/lib/platform/access";

describe("platformAccessFromProfile", () => {
  it("denies when profile missing", () => {
    expect(platformAccessFromProfile(null).canAccessPlatformAdmin).toBe(false);
  });

  it("allows platform_owner", () => {
    const a = platformAccessFromProfile({ platform_role: PLATFORM_ROLE.OWNER });
    expect(a.canAccessPlatformAdmin).toBe(true);
    expect(a.isPlatformOwner).toBe(true);
  });

  it("allows platform_admin", () => {
    const a = platformAccessFromProfile({ platform_role: PLATFORM_ROLE.ADMIN });
    expect(a.canAccessPlatformAdmin).toBe(true);
    expect(a.isPlatformOwner).toBe(false);
  });

  it("allows legacy is_platform_super_admin", () => {
    const a = platformAccessFromProfile({ is_platform_super_admin: true });
    expect(a.canAccessPlatformAdmin).toBe(true);
  });

  it("blocks suspended platform_admin", () => {
    const a = platformAccessFromProfile({
      platform_role: PLATFORM_ROLE.ADMIN,
      platform_staff_suspended: true
    });
    expect(a.canAccessPlatformAdmin).toBe(false);
    expect(a.platformStaffSuspended).toBe(true);
  });

  it("owner still allowed if suspended flag present (owner not suspendable via this column)", () => {
    const a = platformAccessFromProfile({
      platform_role: PLATFORM_ROLE.OWNER,
      platform_staff_suspended: true
    });
    expect(a.canAccessPlatformAdmin).toBe(true);
    expect(a.platformStaffSuspended).toBe(false);
  });
});

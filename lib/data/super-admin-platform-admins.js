import { createAdminClient } from "@/lib/supabase/admin";
import { PLATFORM_ROLE } from "@/lib/platform/access";

function isPlatformStaffRow(row) {
  if (!row) return false;
  if (row.platform_role === PLATFORM_ROLE.OWNER) return true;
  if (row.platform_role === PLATFORM_ROLE.ADMIN) return true;
  if (row.is_platform_super_admin && row.platform_role !== PLATFORM_ROLE.OWNER) return true;
  return false;
}

function displayStaffRole(row) {
  if (row.platform_role === PLATFORM_ROLE.OWNER) return "platform_owner";
  return "platform_admin";
}

/**
 * @returns {Promise<Array<{ id: string, email: string, fullName: string, staffRole: string, suspended: boolean, legacySuperAdminFlag: boolean, createdAt: string | null }>>}
 */
export async function listPlatformStaffAdmin() {
  const admin = createAdminClient();
  const sel = "id, email, full_name, platform_role, is_platform_super_admin, platform_staff_suspended, created_at";

  const [{ data: byRole, error: e1 }, { data: legacyRows, error: e2 }] = await Promise.all([
    admin.from("profiles").select(sel).in("platform_role", [PLATFORM_ROLE.OWNER, PLATFORM_ROLE.ADMIN]),
    admin.from("profiles").select(sel).eq("is_platform_super_admin", true)
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const byId = new Map();
  for (const r of [...(byRole || []), ...(legacyRows || [])]) {
    if (r?.id) byId.set(r.id, r);
  }
  const rows = [...byId.values()];

  const staff = rows.filter(isPlatformStaffRow).map((r) => ({
    id: r.id,
    email: r.email || "",
    fullName: r.full_name || "",
    staffRole: displayStaffRole(r),
    suspended: Boolean(r.platform_staff_suspended),
    legacySuperAdminFlag: Boolean(r.is_platform_super_admin),
    createdAt: r.created_at ? String(r.created_at).slice(0, 10) : null
  }));

  staff.sort((a, b) => {
    if (a.staffRole !== b.staffRole) return a.staffRole === "platform_owner" ? -1 : 1;
    return (a.email || "").localeCompare(b.email || "");
  });

  return staff;
}

/**
 * @param {{ email: string, fullName: string, initialPassword: string }} payload
 */
export async function createPlatformAdminUserAdmin(payload) {
  const admin = createAdminClient();
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const fullName = String(payload.fullName || "").trim();
  const password = String(payload.initialPassword || "");

  if (!email || !fullName) {
    const err = new Error("Email and full name are required.");
    err.code = "VALIDATION";
    throw err;
  }
  if (password.length < 8) {
    const err = new Error("Initial password must be at least 8 characters.");
    err.code = "VALIDATION";
    throw err;
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authErr) throw authErr;
  const userId = authData.user.id;

  const { error: pErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      platform_role: PLATFORM_ROLE.ADMIN,
      is_platform_super_admin: false,
      platform_staff_suspended: false
    },
    { onConflict: "id" }
  );

  if (pErr) {
    await admin.auth.admin.deleteUser(userId);
    throw pErr;
  }

  return {
    id: userId,
    email,
    fullName,
    staffRole: "platform_admin",
    suspended: false
  };
}

/**
 * @param {string} targetUserId
 * @param {boolean} suspended
 * @param {string} actorUserId
 */
export async function setPlatformAdminSuspendedAdmin(targetUserId, suspended, actorUserId) {
  if (targetUserId === actorUserId) {
    const err = new Error("You cannot change your own platform access.");
    err.code = "VALIDATION";
    throw err;
  }

  const admin = createAdminClient();
  const { data: target, error: fe } = await admin
    .from("profiles")
    .select("id, platform_role, is_platform_super_admin")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fe) throw fe;
  if (!target) {
    const err = new Error("User not found.");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (target.platform_role === PLATFORM_ROLE.OWNER) {
    const err = new Error("Platform owner access cannot be suspended here.");
    err.code = "VALIDATION";
    throw err;
  }

  const isAdminCapable =
    target.platform_role === PLATFORM_ROLE.ADMIN ||
    (Boolean(target.is_platform_super_admin) && target.platform_role !== PLATFORM_ROLE.OWNER);

  if (!isAdminCapable) {
    const err = new Error("That user is not a platform administrator.");
    err.code = "VALIDATION";
    throw err;
  }

  const { error } = await admin.from("profiles").update({ platform_staff_suspended: Boolean(suspended) }).eq("id", targetUserId);

  if (error) throw error;
  return { id: targetUserId, suspended: Boolean(suspended) };
}

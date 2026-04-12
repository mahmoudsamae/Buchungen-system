import { createAdminClient } from "@/lib/supabase/admin";
import { PLATFORM_ROLE } from "@/lib/platform/access";

/**
 * If no row has platform_role = platform_owner, promote `userId` to owner.
 * Idempotent and safe under concurrency when `profiles_one_platform_owner_idx` exists:
 * two simultaneous claims may both pass the existence check, but only one UPDATE succeeds;
 * the other hits a unique violation and is ignored.
 *
 * Only call for users who already qualify as platform staff (caller must enforce).
 *
 * @param {string} userId Auth user id
 * @returns {Promise<{ promoted: boolean }>}
 */
export async function claimFirstPlatformOwnerIfNeeded(userId) {
  if (!userId || typeof userId !== "string") {
    return { promoted: false };
  }

  const admin = createAdminClient();

  const { data: existingOwner, error: readErr } = await admin
    .from("profiles")
    .select("id")
    .eq("platform_role", PLATFORM_ROLE.OWNER)
    .limit(1)
    .maybeSingle();

  if (readErr) {
    console.error("[bootstrap-platform-owner] read:", readErr);
    return { promoted: false };
  }

  if (existingOwner?.id) {
    return { promoted: false };
  }

  const { data: target, error: targetErr } = await admin
    .from("profiles")
    .select("id, platform_role")
    .eq("id", userId)
    .maybeSingle();

  if (targetErr || !target?.id) {
    if (targetErr) console.error("[bootstrap-platform-owner] target:", targetErr);
    return { promoted: false };
  }

  if (target.platform_role === PLATFORM_ROLE.OWNER) {
    return { promoted: false };
  }

  const { data: updated, error: upErr } = await admin
    .from("profiles")
    .update({ platform_role: PLATFORM_ROLE.OWNER })
    .eq("id", userId)
    .neq("platform_role", PLATFORM_ROLE.OWNER)
    .select("id")
    .maybeSingle();

  if (upErr) {
    const code = upErr.code || "";
    const msg = String(upErr.message || "");
    if (code === "23505" || msg.includes("profiles_one_platform_owner") || msg.includes("duplicate key")) {
      return { promoted: false };
    }
    console.error("[bootstrap-platform-owner] update:", upErr);
    return { promoted: false };
  }

  return { promoted: Boolean(updated?.id) };
}

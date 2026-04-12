import { createClient } from "@/lib/supabase/server";
import { platformAccessFromProfile } from "@/lib/platform/access";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase };
  return { user, supabase };
}

/** @returns {Promise<{ user: import('@supabase/supabase-js').User, profile: object, supabase: import('@supabase/supabase-js').SupabaseClient } | { user: null }>} */
export async function getSessionUserWithProfile() {
  const { user, supabase } = await getSessionUser();
  if (!user) return { user: null };

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return { user: null };

  return { user, profile, supabase };
}

/** Platform administration (owner, admin, or legacy super-admin flag). */
export async function requireSuperAdmin() {
  const ctx = await getSessionUserWithProfile();
  if (!ctx.user || !ctx.profile) {
    return null;
  }
  const platformAccess = platformAccessFromProfile(ctx.profile);
  if (!platformAccess.canAccessPlatformAdmin) {
    return null;
  }
  return { ...ctx, platformAccess };
}

/** Active platform_owner only (for owner-only APIs and routes). */
export async function requirePlatformOwner() {
  const ctx = await requireSuperAdmin();
  if (!ctx?.platformAccess?.isPlatformOwner) {
    return null;
  }
  return ctx;
}

const BUSINESS_SELECT = `
  business_id,
  role,
  status,
  businesses (*)
`;

/**
 * Active manager memberships (+ business rows). Slug is matched case-sensitively as stored in DB.
 * @param {{ slug?: string | null }} [options]
 * @returns {Promise<{ business: object, user: object, supabase: import('@supabase/supabase-js').SupabaseClient } | null>}
 */
function normSlug(s) {
  return String(s || "").trim().toLowerCase();
}

export async function requireManagerContext(options = {}) {
  const wantSlug = options.slug != null && String(options.slug).trim() !== "" ? normSlug(options.slug) : null;

  const { user, supabase } = options.cachedSession ?? (await getSessionUser());
  if (!user) return null;

  const { data: rows, error } = await supabase
    .from("business_users")
    .select(BUSINESS_SELECT)
    .eq("user_id", user.id)
    .eq("role", "manager")
    .eq("status", "active");

  if (error || !rows?.length) return null;

  const businesses = rows.map((r) => r.businesses).filter(Boolean);
  if (!businesses.length) return null;

  let business;
  if (wantSlug) {
    business = businesses.find((b) => normSlug(b.slug) === wantSlug);
  } else {
    business = businesses[0];
  }

  if (!business) return null;

  return { business, user, supabase };
}

/**
 * Active staff (teacher) membership for a business.
 * @param {{ slug?: string | null }} [options]
 * @returns {Promise<{ business: object, user: object, supabase: import('@supabase/supabase-js').SupabaseClient } | null>}
 */
export async function requireStaffContext(options = {}) {
  const wantSlug = options.slug != null && String(options.slug).trim() !== "" ? normSlug(options.slug) : null;

  const { user, supabase } = options.cachedSession ?? (await getSessionUser());
  if (!user) return null;

  const { data: rows, error } = await supabase
    .from("business_users")
    .select(BUSINESS_SELECT)
    .eq("user_id", user.id)
    .eq("role", "staff")
    .eq("status", "active");

  if (error || !rows?.length) return null;

  const businesses = rows.map((r) => r.businesses).filter(Boolean);
  if (!businesses.length) return null;

  let business;
  if (wantSlug) {
    business = businesses.find((b) => normSlug(b.slug) === wantSlug);
  } else {
    business = businesses[0];
  }

  if (!business) return null;

  return { business, user, supabase };
}

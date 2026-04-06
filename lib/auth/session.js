import { createClient } from "@/lib/supabase/server";

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

export async function requireSuperAdmin() {
  const ctx = await getSessionUserWithProfile();
  if (!ctx.user || !ctx.profile?.is_platform_super_admin) {
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
export async function requireManagerContext(options = {}) {
  const wantSlug = options.slug != null && String(options.slug).trim() !== "" ? String(options.slug).trim() : null;

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
    business = businesses.find((b) => b.slug === wantSlug);
  } else {
    business = businesses[0];
  }

  if (!business) return null;

  return { business, user, supabase };
}

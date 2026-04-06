/**
 * After the demo customer signs in, resolve `/portal/[slug]/book`.
 * Uses two queries (membership → business slug) so we do not rely on PostgREST embeds.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} [userId] — pass `data.user.id` right after signInWithPassword (avoids stale getUser)
 * @returns {Promise<string | null>} e.g. `/portal/acme/book`
 */
export async function resolveDemoCustomerPortalBookPath(supabase, userId) {
  let uid = userId;
  if (!uid) {
    const {
      data: { user },
      error: userErr
    } = await supabase.auth.getUser();
    if (userErr || !user) return null;
    uid = user.id;
  }

  const { data: mem, error: memErr } = await supabase
    .from("business_users")
    .select("business_id")
    .eq("user_id", uid)
    .eq("role", "customer")
    .eq("status", "active")
    .maybeSingle();

  if (memErr) {
    console.error("resolveDemoCustomerPortalBookPath membership", memErr.message);
  }

  if (mem?.business_id) {
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("slug")
      .eq("id", mem.business_id)
      .maybeSingle();

    if (bizErr) {
      console.error("resolveDemoCustomerPortalBookPath business", bizErr.message);
    }
    if (biz?.slug && typeof biz.slug === "string") {
      return `/portal/${biz.slug}/book`;
    }
  }

  const fallback = process.env.NEXT_PUBLIC_DEMO_BUSINESS_SLUG;
  if (fallback && typeof fallback === "string") {
    return `/portal/${fallback}/book`;
  }

  return null;
}

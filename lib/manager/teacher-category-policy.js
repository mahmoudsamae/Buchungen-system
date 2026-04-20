/**
 * Resolve categories a teacher may use based on active teacher_services links.
 * If no explicit teacher_services rows exist, returns unrestricted mode for backwards compatibility.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} businessId
 * @param {string} teacherUserId
 * @returns {Promise<{ mode: "unrestricted", categories: Array<{id: string, name: string}> } | { mode: "restricted", categories: Array<{id: string, name: string}>, categoryIds: Set<string> }>}
 */
export async function getTeacherAllowedCategories(supabase, businessId, teacherUserId) {
  const { data: links, error: lErr } = await supabase
    .from("teacher_services")
    .select("service_id")
    .eq("business_id", businessId)
    .eq("teacher_id", teacherUserId)
    .eq("is_active", true);

  if (lErr) {
    return { mode: "unrestricted", categories: [] };
  }

  const serviceIds = [...new Set((links || []).map((r) => String(r.service_id || "")).filter(Boolean))];
  if (!serviceIds.length) {
    return { mode: "unrestricted", categories: [], assignedServiceIds: [], derivedCategoryIds: [] };
  }

  const { data: services, error: sErr } = await supabase
    .from("services")
    .select("id, category_id")
    .eq("business_id", businessId)
    .in("id", serviceIds)
    .eq("is_active", true);

  if (sErr) {
    console.warn("[teacher-category-policy] services lookup failed, falling back to unrestricted:", sErr.message);
    return { mode: "unrestricted", categories: [], assignedServiceIds: serviceIds, derivedCategoryIds: [] };
  }

  const categoryIds = [...new Set((services || []).map((s) => String(s.category_id || "")).filter(Boolean))];
  if (!categoryIds.length) {
    return { mode: "unrestricted", categories: [], assignedServiceIds: serviceIds, derivedCategoryIds: [] };
  }

  const { data: cats } = await supabase
    .from("training_categories")
    .select("id, name, is_active")
    .eq("business_id", businessId)
    .in("id", categoryIds)
    .eq("is_active", true)
    .order("name");

  const categories = (cats || []).map((c) => ({ id: String(c.id), name: String(c.name || "") }));
  if (!categories.length) {
    return { mode: "unrestricted", categories: [], assignedServiceIds: serviceIds, derivedCategoryIds: categoryIds };
  }
  return {
    mode: "restricted",
    categories,
    categoryIds: new Set(categories.map((c) => c.id)),
    assignedServiceIds: serviceIds,
    derivedCategoryIds: categoryIds
  };
}


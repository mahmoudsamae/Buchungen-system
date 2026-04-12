export async function findCategoryForBusiness(supabase, businessId, categoryId) {
  if (!categoryId) return { category: null, error: null };
  const { data, error } = await supabase
    .from("training_categories")
    .select("id, business_id, name, is_active")
    .eq("id", categoryId)
    .eq("business_id", businessId)
    .maybeSingle();
  return { category: data || null, error: error || null };
}

export function normalizeCategoryId(input) {
  if (input === undefined) return undefined;
  if (input === null) return null;
  const v = String(input).trim();
  return v === "" ? null : v;
}

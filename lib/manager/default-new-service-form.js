/**
 * Initial state for creating a school service in manager UIs.
 * @param {Array<{ id: string, is_active?: boolean, status?: string }>} categories
 * @param {{ categoryId?: string }} [options] — pre-select a category when adding from a category section
 */
export function buildDefaultNewServiceForm(categories, options = {}) {
  const list = categories || [];
  const first = list.find((c) => c.is_active !== false && c.status !== "inactive") || list[0];
  const preset = options.categoryId;
  return {
    name: "",
    duration: 45,
    price: "",
    description: "",
    status: "active",
    categoryId: preset ?? first?.id ?? ""
  };
}

import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import {
  getServiceTemplateById,
  listServiceTemplates,
  listServiceSuggestions
} from "@/lib/manager/service-templates";

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  return NextResponse.json({ templates: listServiceTemplates(), suggestions: listServiceSuggestions() });
}

export async function POST(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateId = String(body.templateId || "").trim();
  const suggestionIds = Array.isArray(body.suggestionIds)
    ? body.suggestionIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const suggestionsById = new Map(listServiceSuggestions().map((s) => [s.id, s]));

  let template = null;
  if (templateId) {
    template = getServiceTemplateById(templateId);
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  } else if (suggestionIds.length === 0) {
    return NextResponse.json({ error: "templateId or suggestionIds is required." }, { status: 400 });
  }

  const categoriesFromSuggestions = new Map();
  if (!template && suggestionIds.length) {
    for (const id of suggestionIds) {
      const s = suggestionsById.get(id);
      if (!s) continue;
      if (!categoriesFromSuggestions.has(s.categoryName)) {
        categoriesFromSuggestions.set(s.categoryName, { name: s.categoryName, description: s.categoryDescription || "", services: [] });
      }
      categoriesFromSuggestions.get(s.categoryName).services.push({
        name: s.name,
        duration: s.duration,
        price: s.price,
        description: s.description || ""
      });
    }
    template = {
      id: "manual-selection",
      name: "Manual selection",
      categories: [...categoriesFromSuggestions.values()]
    };
  }

  let createdCategories = 0;
  let createdServices = 0;
  let skippedServices = 0;
  const categoryIdByName = new Map();

  for (const cat of template.categories || []) {
    const catName = String(cat.name || "").trim();
    if (!catName) continue;

    const { data: existingCat, error: catSelErr } = await supabase
      .from("training_categories")
      .select("id")
      .eq("business_id", business.id)
      .eq("name", catName)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (catSelErr) return NextResponse.json({ error: catSelErr.message }, { status: 400 });

    let categoryId = existingCat?.id || null;
    if (!categoryId) {
      const { data: createdCat, error: catInsErr } = await supabase
        .from("training_categories")
        .insert({
          business_id: business.id,
          name: catName,
          description: String(cat.description || "").trim() || null,
          is_active: true
        })
        .select("id")
        .single();
      if (catInsErr) return NextResponse.json({ error: catInsErr.message }, { status: 400 });
      categoryId = createdCat.id;
      createdCategories += 1;
    }
    categoryIdByName.set(catName, categoryId);
  }

  for (const cat of template.categories || []) {
    const catName = String(cat.name || "").trim();
    const categoryId = categoryIdByName.get(catName);
    if (!categoryId) continue;

    for (const svc of cat.services || []) {
      const serviceName = String(svc.name || "").trim();
      if (!serviceName) continue;
      const duration = Number(svc.duration);
      if (!Number.isInteger(duration) || duration < 5 || duration > 480) continue;

      const { data: existingSvc, error: svcSelErr } = await supabase
        .from("services")
        .select("id")
        .eq("business_id", business.id)
        .eq("category_id", categoryId)
        .eq("name", serviceName)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (svcSelErr) return NextResponse.json({ error: svcSelErr.message }, { status: 400 });
      if (existingSvc?.id) {
        skippedServices += 1;
        continue;
      }

      const price = svc.price == null ? null : Number(svc.price);
      const { error: svcInsErr } = await supabase.from("services").insert({
        business_id: business.id,
        category_id: categoryId,
        name: serviceName,
        duration_minutes: duration,
        price: Number.isFinite(price) && price >= 0 ? price : null,
        description: String(svc.description || "").trim() || null,
        is_active: true
      });
      if (svcInsErr) return NextResponse.json({ error: svcInsErr.message }, { status: 400 });
      createdServices += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    templateId: template?.id || templateId || null,
    createdCategories,
    createdServices,
    skippedServices
  });
}


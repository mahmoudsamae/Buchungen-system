import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { claimFirstPlatformOwnerIfNeeded } from "@/lib/platform/bootstrap-platform-owner";
import { platformAccessFromProfile } from "@/lib/platform/access";
import {
  businessRowToSettings,
  pickDefined,
  settingsFormToDbRow,
  validateBusinessSettingsPayload
} from "@/lib/manager/business-settings";

export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, user, supabase } = g.ctx;

  let { data: profileRow } = await supabase
    .from("profiles")
    .select("platform_role, is_platform_super_admin, platform_staff_suspended")
    .eq("id", user.id)
    .maybeSingle();

  const access = platformAccessFromProfile(profileRow);
  if (access.canAccessPlatformAdmin) {
    await claimFirstPlatformOwnerIfNeeded(user.id);
    const { data: fresh } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (fresh) profileRow = fresh;
  }

  return NextResponse.json({
    business,
    settings: businessRowToSettings(business),
    platformAccess: platformAccessFromProfile(profileRow)
  });
}

export async function PATCH(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { business, supabase } = g.ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const merged = { ...businessRowToSettings(business), ...pickDefined(body) };

  const { errors } = validateBusinessSettingsPayload(merged);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }

  const row = settingsFormToDbRow(merged);

  const { data: updated, error } = await supabase
    .from("businesses")
    .update(row)
    .eq("id", business.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    business: updated,
    settings: businessRowToSettings(updated)
  });
}

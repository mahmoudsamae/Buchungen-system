import { NextResponse } from "next/server";
import { getSessionUserWithProfile } from "@/lib/auth/session";
import { claimFirstPlatformOwnerIfNeeded } from "@/lib/platform/bootstrap-platform-owner";
import { platformAccessFromProfile } from "@/lib/platform/access";

/** Lightweight session shape for post-login routing (no manager membership required). */
export async function GET() {
  const ctx = await getSessionUserWithProfile();
  if (!ctx.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profile = ctx.profile;
  const access = platformAccessFromProfile(profile);

  if (access.canAccessPlatformAdmin) {
    await claimFirstPlatformOwnerIfNeeded(ctx.user.id);
    const { data: fresh } = await ctx.supabase.from("profiles").select("*").eq("id", ctx.user.id).maybeSingle();
    if (fresh) profile = fresh;
  }

  return NextResponse.json({
    platformAccess: platformAccessFromProfile(profile)
  });
}

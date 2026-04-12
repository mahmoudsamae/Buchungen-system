import { NextResponse } from "next/server";
import { guardSuperAdminJson } from "@/lib/auth/guards";
import { claimFirstPlatformOwnerIfNeeded } from "@/lib/platform/bootstrap-platform-owner";
import { platformAccessFromProfile } from "@/lib/platform/access";

/** Current user's platform role flags (for console UI). */
export async function GET() {
  const g = await guardSuperAdminJson();
  if (g.response) return g.response;
  const { user, profile, supabase } = g.ctx;

  await claimFirstPlatformOwnerIfNeeded(user.id);
  const { data: fresh } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const platformAccess = platformAccessFromProfile(fresh || profile);

  return NextResponse.json({
    isPlatformOwner: Boolean(platformAccess?.isPlatformOwner),
    isPlatformStaff: true,
    platformRole: platformAccess?.platformRole ?? null,
    platformStaffSuspended: Boolean(platformAccess?.platformStaffSuspended)
  });
}

import { redirect } from "next/navigation";
import { getSessionUserWithProfile, requireManagerContext } from "@/lib/auth/session";
import { schoolLoginPath } from "@/lib/auth/tenant-login-urls";
import { ManagerShell } from "@/components/manager/manager-shell";
import { platformAccessFromProfile } from "@/lib/platform/access";

export const dynamic = "force-dynamic";

export default async function ManagerSlugLayout({ children, params }) {
  const { slug } = await params;
  const ctx = await requireManagerContext({ slug });
  if (!ctx) {
    // Routing-safe fallback: if slug is stale/invalid but user is still a manager,
    // redirect to their first active manager workspace instead of hard-failing.
    const fallback = await requireManagerContext();
    if (!fallback) redirect(schoolLoginPath(slug));
    redirect(`/manager/${fallback.business.slug}/dashboard`);
  }

  const session = await getSessionUserWithProfile();
  const initialPlatformAccess = platformAccessFromProfile(session?.profile ?? null);

  return (
    <ManagerShell business={ctx.business} userId={ctx.user.id} initialPlatformAccess={initialPlatformAccess}>
      {children}
    </ManagerShell>
  );
}

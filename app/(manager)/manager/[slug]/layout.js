import { redirect } from "next/navigation";
import { requireManagerContext } from "@/lib/auth/session";
import { ManagerShell } from "@/components/manager/manager-shell";

export const dynamic = "force-dynamic";

export default async function ManagerSlugLayout({ children, params }) {
  const { slug } = await params;
  const ctx = await requireManagerContext({ slug });
  if (!ctx) {
    // Routing-safe fallback: if slug is stale/invalid but user is still a manager,
    // redirect to their first active manager workspace instead of hard-failing.
    const fallback = await requireManagerContext();
    if (!fallback) redirect("/business/login");
    redirect(`/manager/${fallback.business.slug}/dashboard`);
  }

  return (
    <ManagerShell business={ctx.business} userId={ctx.user.id}>
      {children}
    </ManagerShell>
  );
}

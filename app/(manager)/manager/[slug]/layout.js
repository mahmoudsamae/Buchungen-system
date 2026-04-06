import { redirect } from "next/navigation";
import { requireManagerContext } from "@/lib/auth/session";
import { ManagerShell } from "@/components/manager/manager-shell";

export const dynamic = "force-dynamic";

export default async function ManagerSlugLayout({ children, params }) {
  const { slug } = await params;
  const ctx = await requireManagerContext({ slug });
  if (!ctx) redirect("/business/login");

  return (
    <ManagerShell business={ctx.business} userId={ctx.user.id}>
      {children}
    </ManagerShell>
  );
}

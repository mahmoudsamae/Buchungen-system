import { redirect } from "next/navigation";
import { requireManagerContext } from "@/lib/auth/session";

export default async function LegacyManagerDashboardRedirect() {
  const ctx = await requireManagerContext();
  if (!ctx) redirect("/business/login");
  redirect(`/manager/${ctx.business.slug}/dashboard`);
}

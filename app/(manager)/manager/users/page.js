import { redirect } from "next/navigation";
import { requireManagerContext } from "@/lib/auth/session";
import { schoolLoginMarketingPath } from "@/lib/auth/tenant-login-urls";

export default async function LegacyManagerUsersRedirect() {
  const ctx = await requireManagerContext();
  if (!ctx) redirect(schoolLoginMarketingPath());
  redirect(`/manager/${ctx.business.slug}/dashboard`);
}

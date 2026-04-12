import { redirect } from "next/navigation";
import { requireManagerContext } from "@/lib/auth/session";
import { schoolLoginMarketingPath } from "@/lib/auth/tenant-login-urls";

export default async function LegacyManagerSettingsRedirect() {
  const ctx = await requireManagerContext();
  if (!ctx) redirect(schoolLoginMarketingPath());
  redirect(`/manager/${ctx.business.slug}/settings`);
}

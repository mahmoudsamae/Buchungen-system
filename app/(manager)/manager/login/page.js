import { redirect } from "next/navigation";
import { schoolLoginMarketingPath } from "@/lib/auth/tenant-login-urls";

/** @deprecated Use `/login/school/[slug]`. */
export default async function LegacyManagerLoginPage({ searchParams }) {
  const sp = await searchParams;
  const qp = new URLSearchParams();
  for (const [key, value] of Object.entries(sp || {})) {
    if (Array.isArray(value)) {
      for (const v of value) qp.append(key, String(v));
    } else if (value != null) {
      qp.set(key, String(value));
    }
  }
  const query = qp.toString();
  const base = schoolLoginMarketingPath();
  redirect(query ? `${base}?${query}` : base);
}

import { redirect } from "next/navigation";

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
  redirect(query ? `/business/login?${query}` : "/business/login");
}

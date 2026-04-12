import { redirect } from "next/navigation";

/** Pretty entry for QR / links — forwards to portal login (same auth), then student UI. */
export default async function StudentLoginEntryPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const next = typeof sp?.next === "string" ? sp.next : "";
  const q = new URLSearchParams();
  if (next && next.startsWith("/")) q.set("next", next);
  else q.set("next", `/student/${encodeURIComponent(slug)}`);
  redirect(`/portal/${encodeURIComponent(slug)}/login?${q.toString()}`);
}

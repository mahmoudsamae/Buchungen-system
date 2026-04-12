import { redirect } from "next/navigation";

export default async function AlertsRedirectPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${encodeURIComponent(slug)}/dashboard`);
}

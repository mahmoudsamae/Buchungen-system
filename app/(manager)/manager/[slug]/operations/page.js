import { redirect } from "next/navigation";

export default async function OperationsRedirectPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${encodeURIComponent(slug)}/dashboard`);
}

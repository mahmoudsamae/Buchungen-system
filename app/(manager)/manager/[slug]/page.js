import { redirect } from "next/navigation";

export default async function ManagerSlugIndexPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${slug}/dashboard`);
}

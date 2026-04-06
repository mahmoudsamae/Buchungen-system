import { redirect } from "next/navigation";

/** MVP: internal team UI is hidden; route kept for bookmarks/API symmetry — sends users to dashboard. */
export default async function ManagerUsersRedirectPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${slug}/dashboard`);
}

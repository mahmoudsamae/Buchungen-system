import { redirect } from "next/navigation";

/** MVP: internal team UI hidden; route kept for bookmarks/API symmetry. */
export default async function ManagerUsersRedirectPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${slug}/dashboard`);
}

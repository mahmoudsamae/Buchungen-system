import { redirect } from "next/navigation";

/** Student roster moved under each teacher profile — use Teachers → teacher → Students. */
export default async function StudentsRedirectPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${encodeURIComponent(slug)}/teachers`);
}

import { redirect } from "next/navigation";

export default async function TeacherIndexPage({ params }) {
  const { slug } = await params;
  redirect(`/teacher/${encodeURIComponent(slug)}/dashboard`);
}

import { redirect } from "next/navigation";

export default async function CustomersPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${slug}/teachers`);
}

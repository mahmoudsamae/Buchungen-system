import { redirect } from "next/navigation";

/** Services are edited on the Categories page (`/categories`). */
export default async function ServicesPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${slug}/categories`);
}

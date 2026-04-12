import { redirect } from "next/navigation";

/** School-level booking lists are retired — inspect bookings per teacher on their profile. */
export default async function BookingsRedirectPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${encodeURIComponent(slug)}/teachers`);
}

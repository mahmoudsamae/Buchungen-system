import { redirect } from "next/navigation";

/** Calendars are teacher-scoped — open a teacher profile → Calendar tab. */
export default async function CalendarRedirectPage({ params }) {
  const { slug } = await params;
  redirect(`/manager/${encodeURIComponent(slug)}/teachers`);
}

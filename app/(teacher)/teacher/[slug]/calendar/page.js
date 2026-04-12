import { requireStaffContext } from "@/lib/auth/session";
import { TeacherCalendarClient } from "@/components/teacher/teacher-calendar-client";

export const dynamic = "force-dynamic";

export default async function TeacherCalendarPage({ params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;
  return <TeacherCalendarClient schoolSlug={ctx.business.slug} />;
}

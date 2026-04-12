import { requireStaffContext } from "@/lib/auth/session";
import { TeacherBookingsClient } from "@/components/teacher/teacher-bookings-client";

export const dynamic = "force-dynamic";

export default async function TeacherBookingsPage({ params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;
  return <TeacherBookingsClient schoolSlug={ctx.business.slug} />;
}

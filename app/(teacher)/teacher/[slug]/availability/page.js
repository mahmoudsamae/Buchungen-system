import { requireStaffContext } from "@/lib/auth/session";
import { TeacherAvailabilityClient } from "@/components/teacher/teacher-availability-client";

export const dynamic = "force-dynamic";

export default async function TeacherAvailabilityPage({ params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;
  return <TeacherAvailabilityClient schoolSlug={ctx.business.slug} />;
}

import { requireStaffContext } from "@/lib/auth/session";
import { TeacherServicesClient } from "@/components/teacher/teacher-services-client";

export const dynamic = "force-dynamic";

export default async function TeacherServicesPage({ params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;
  return <TeacherServicesClient schoolSlug={ctx.business.slug} />;
}

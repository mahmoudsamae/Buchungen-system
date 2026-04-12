import { requireStaffContext } from "@/lib/auth/session";
import { TeacherStudentsClient } from "@/components/teacher/teacher-students-client";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage({ params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;
  return <TeacherStudentsClient schoolSlug={ctx.business.slug} />;
}

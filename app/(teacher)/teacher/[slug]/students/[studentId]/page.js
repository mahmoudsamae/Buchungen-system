import { requireStaffContext } from "@/lib/auth/session";
import { TeacherStudentDetailClient } from "@/components/teacher/teacher-student-detail-client";

export const dynamic = "force-dynamic";

export default async function TeacherStudentDetailPage({ params }) {
  const { slug, studentId } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;
  return <TeacherStudentDetailClient schoolSlug={ctx.business.slug} studentId={studentId} />;
}

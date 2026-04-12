import { requireStaffContext } from "@/lib/auth/session";
import { TeacherAnalyticsClient } from "@/components/teacher/teacher-analytics-client";

export const dynamic = "force-dynamic";

export default async function TeacherAnalyticsPage({ params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;
  return <TeacherAnalyticsClient schoolSlug={ctx.business.slug} />;
}

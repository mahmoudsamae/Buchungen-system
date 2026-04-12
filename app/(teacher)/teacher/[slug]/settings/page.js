import { requireStaffContext } from "@/lib/auth/session";
import { TeacherSettingsClient } from "@/components/teacher/teacher-settings-client";

export const dynamic = "force-dynamic";

export default async function TeacherSettingsPage({ params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;
  return <TeacherSettingsClient schoolSlug={ctx.business.slug} />;
}

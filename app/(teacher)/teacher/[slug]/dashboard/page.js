import { requireStaffContext } from "@/lib/auth/session";
import { TeacherDashboardHome } from "./teacher-dashboard-home";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage({ params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) return null;

  return (
    <TeacherDashboardHome
      schoolName={ctx.business.name}
      schoolSlug={ctx.business.slug}
      userEmail={ctx.user.email ?? ""}
    />
  );
}

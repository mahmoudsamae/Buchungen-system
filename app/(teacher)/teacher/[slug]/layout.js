import { redirect } from "next/navigation";
import { requireStaffContext } from "@/lib/auth/session";
import { TeacherShell } from "@/components/teacher/teacher-shell";

export const dynamic = "force-dynamic";

export default async function TeacherSlugLayout({ children, params }) {
  const { slug } = await params;
  const ctx = await requireStaffContext({ slug });
  if (!ctx) {
    redirect(`/login/teacher/${encodeURIComponent(String(slug || "").trim())}`);
  }

  return <TeacherShell business={ctx.business}>{children}</TeacherShell>;
}

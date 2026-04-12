import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveStudentAccessToken } from "@/lib/student-access/student-access-tokens";

export const dynamic = "force-dynamic";

export default async function StudentAccessLandingPage({ params }) {
  const token = String((await params).token || "").trim();
  if (!token) notFound();

  const admin = createAdminClient();
  const resolved = await resolveStudentAccessToken(admin, token);
  if (!resolved) notFound();

  const [{ data: biz }, { data: tprof }] = await Promise.all([
    admin.from("businesses").select("slug, name").eq("id", resolved.businessId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", resolved.teacherUserId).maybeSingle()
  ]);

  const schoolName = String(biz?.name || "").trim() || "Driving school";
  const teacherName = String(tprof?.full_name || "").trim() || "Your instructor";
  const slug = String(biz?.slug || "").trim();
  if (!slug) notFound();

  const loginHref = `/login/student-access?token=${encodeURIComponent(token)}&next=${encodeURIComponent(`/student/${slug}`)}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Student access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{schoolName}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You are invited to sign in for lessons with <span className="font-medium text-foreground">{teacherName}</span>.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          This link is personal to you and your instructor. Use the email your school gave you.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={loginHref}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Continue to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

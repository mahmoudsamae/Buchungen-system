"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/navigation/page-header";
import { useManager } from "@/components/manager/provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { SchoolTeacherProfileView } from "@/components/school/school-teacher-profile-view";

function TeacherProfileInner() {
  const params = useParams();
  const userId = params?.userId;
  const { business } = useManager();
  const { t } = useLanguage();
  const slug = business?.slug ?? "";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug || !userId) return;
    setLoading(true);
    setError("");
    const res = await managerFetch(slug, `/api/manager/teachers/${userId}`);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error || "Could not load teacher.");
      setData(null);
      setLoading(false);
      return;
    }
    setData(j);
    setLoading(false);
  }, [slug, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const name = data?.profile?.full_name || data?.profile?.email || "Teacher";

  return (
    <>
      <PageHeader
        businessName={business?.name}
        subtitle={name}
        actions={
          <Link href={`/manager/${slug}/teachers`} className="rounded-xl border border-border px-3 py-2 text-xs font-medium">
            ← {t("manager.nav.teachers")}
          </Link>
        }
      />
      <main className="space-y-8 p-4 pb-12 md:p-6 md:pb-16">
        <SchoolTeacherProfileView
          slug={slug}
          userId={userId}
          businessName={business?.name ?? ""}
          data={data}
          error={error}
          loading={loading}
          onReload={load}
        />
      </main>
    </>
  );
}

export default function SchoolTeacherDetailPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <TeacherProfileInner />
    </Suspense>
  );
}

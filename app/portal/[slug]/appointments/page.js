"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarClock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLanguage } from "@/components/i18n/language-provider";
import { createClient } from "@/lib/supabase/client";

export default function PortalAppointmentsPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [experience, setExperience] = useState(null);
  const [toast, setToast] = useState("");
  const [cancelingId, setCancelingId] = useState(null);

  const loadBookings = useCallback(async () => {
    const res = await fetch(`/api/portal/${slug}/bookings`);
    if (res.status === 401) {
      router.replace(`/portal/${slug}/login?next=/portal/${slug}/appointments`);
      return;
    }
    const data = await res.json();
    setRows(data.bookings || []);
  }, [slug, router]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBookings();
      setLoading(false);
    })();
  }, [loadBookings]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/portal/${slug}/experience`);
      if (res.ok) setExperience(await res.json());
    })();
  }, [slug]);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        setDisplayName(data?.full_name?.trim() || "");
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const lo = locale === "de" ? "de-DE" : "en-US";

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const d = String(b.booking_date || "").localeCompare(String(a.booking_date || ""));
        if (d !== 0) return d;
        return String(b.start_time || "").localeCompare(String(a.start_time || ""));
      }),
    [rows]
  );

  const onCancel = async (id) => {
    if (typeof window !== "undefined" && !window.confirm(t("portal.appointments.cancelConfirm"))) return;
    setCancelingId(id);
    setToast("");
    const res = await fetch(`/api/portal/${slug}/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" })
    });
    setCancelingId(null);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setToast(e.error || t("portal.appointments.cancelBlocked"));
      return;
    }
    setToast(t("portal.appointments.cancelled"));
    await loadBookings();
    window.setTimeout(() => setToast(""), 3200);
  };

  return (
    <div className="px-4 py-8 md:px-6 md:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            {t("portal.appointments.forYou")}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t("portal.appointments.title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("portal.appointments.subtitle")}</p>
          {displayName ? (
            <p className="mt-3 text-sm font-medium text-foreground">
              {t("portal.welcome")}, <span className="text-primary">{displayName}</span>
            </p>
          ) : null}
        </div>
        <Link
          href={`/portal/${slug}/book`}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-110"
        >
          {t("portal.appointments.bookCta")}
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-12 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4 animate-pulse" aria-hidden />
          {t("portal.appointments.loading")}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarClock className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-4 text-lg font-semibold">{t("portal.appointments.empty")}</p>
          <Link
            href={`/portal/${slug}/book`}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            {t("portal.appointments.bookCta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((b) => {
            let when = "";
            try {
              const d = new Date(`${b.booking_date}T12:00:00`);
              when = new Intl.DateTimeFormat(lo, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
            } catch {
              when = b.booking_date;
            }
            return (
              <Card key={b.id} className="overflow-hidden border-border/70 transition hover:border-primary/25 hover:shadow-md">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/50 text-center">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {String(b.booking_date).slice(5, 7)}
                      </span>
                      <span className="text-lg font-bold leading-none tabular-nums">{String(b.booking_date).slice(8, 10)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{when}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
                        <span className="font-medium text-foreground">{String(b.start_time).slice(0, 5)}</span>
                        <span aria-hidden>·</span>
                        <span>{t("portal.appointments.localTime")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <StatusBadge value={b.status} />
                    {experience &&
                    experience.allow_customer_cancellations &&
                    ["pending", "confirmed"].includes(String(b.status)) ? (
                      <button
                        type="button"
                        disabled={cancelingId === b.id}
                        onClick={() => onCancel(b.id)}
                        className="rounded-lg border border-border/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                      >
                        {cancelingId === b.id ? t("common.loading") : t("portal.appointments.cancel")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-[min(100%,20rem)] rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-card">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

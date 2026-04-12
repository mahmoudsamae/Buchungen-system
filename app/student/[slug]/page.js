"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, LayoutGrid, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";

export default function StudentPortalHomePage() {
  const { slug } = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const base = `/student/${slug}`;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/portal/${slug}/bookings`);
    if (res.status === 401) {
      router.replace(`${base}/login?next=${encodeURIComponent(base)}`);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setBookings(data.bookings || []);
  }, [slug, router, base]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      const pr = await fetch(`/api/portal/${slug}/profile`);
      if (pr.ok) {
        const j = await pr.json();
        setProfile(j);
      }
      setLoading(false);
    })();
  }, [load, slug]);

  const upcoming = useMemo(() => {
    const active = new Set(["pending", "confirmed"]);
    const now = new Date();
    return (bookings || [])
      .filter((b) => {
        const st = normalizeBookingStatus(b.status) || "";
        if (!active.has(st)) return false;
        const ds = String(b.booking_date || "").slice(0, 10);
        const start = new Date(`${ds}T${String(b.start_time).slice(0, 8)}`);
        return !Number.isNaN(start.getTime()) && start > now;
      })
      .sort((a, b) => {
        const da = String(a.booking_date).localeCompare(String(b.booking_date));
        if (da !== 0) return da;
        return String(a.start_time).localeCompare(String(b.start_time));
      })
      .slice(0, 5);
  }, [bookings]);

  const summary = useMemo(() => {
    let p = 0;
    let c = 0;
    let x = 0;
    for (const b of bookings || []) {
      const st = normalizeBookingStatus(b.status) || "";
      if (st === "pending") p += 1;
      if (st === "confirmed") c += 1;
      if (st.startsWith("cancelled") || st === "rejected") x += 1;
    }
    return { p, c, x };
  }, [bookings]);

  return (
    <div className="space-y-8 px-4 py-8 md:px-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{profile?.business?.name || slug}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          {t("portal.welcome")}
          {profile?.profile?.fullName ? `, ${profile.profile.fullName}` : ""}
        </h1>
        {profile?.primaryInstructor?.fullName ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Instructor: <span className="text-foreground/90">{profile.primaryInstructor.fullName}</span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/50 bg-card/80">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold tabular-nums">{summary.p}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold tabular-nums">{summary.c}</p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold tabular-nums">{summary.x}</p>
            <p className="text-xs text-muted-foreground">Cancelled / rejected</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`${base}/book`}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Book a lesson
        </Link>
        <Link
          href={`${base}/appointments`}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-4 text-sm font-medium transition hover:bg-muted"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          All appointments
        </Link>
      </div>

      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Next up</CardTitle>
          <Sparkles className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming lessons. Book your next slot anytime.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-muted-foreground">
                    {String(b.booking_date).slice(0, 10)} · {String(b.start_time).slice(0, 5)}
                  </span>
                  <StatusBadge value={normalizeBookingStatus(b.status) || b.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

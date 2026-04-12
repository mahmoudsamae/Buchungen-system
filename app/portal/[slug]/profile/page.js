"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { customerUiBasePath } from "@/lib/portal/customer-base-path";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/i18n/language-provider";
import { StatusBadge } from "@/components/shared/status-badge";

export default function PortalProfilePage() {
  const { slug } = useParams();
  const pathname = usePathname();
  const base = customerUiBasePath(pathname, slug);
  const { t, locale } = useLanguage();
  const lo = locale === "de" ? "de-DE" : "en-US";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/${slug}/profile`);
      if (res.ok) {
        const j = await res.json();
        setProfileData(j);
        setFullName(j.profile?.fullName || "");
        setPhone(j.profile?.phone || "");
        setEmail(j.profile?.email || "");
      } else {
        setProfileData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    if (error) {
      setMsg(t("portal.profile.saveFailed"));
      return;
    }
    setMsg(t("portal.profile.saved"));
    await loadProfile();
  };

  const memberSince =
    profileData?.membership?.memberSinceISO &&
    (() => {
      try {
        return new Intl.DateTimeFormat(lo, { year: "numeric", month: "long", day: "numeric" }).format(
          new Date(profileData.membership.memberSinceISO)
        );
      } catch {
        return null;
      }
    })();

  const lastBookingLabel =
    profileData?.stats?.lastBooking &&
    (() => {
      const b = profileData.stats.lastBooking;
      if (!b?.date) return t("portal.profile.lastBookingNone");
      try {
        const datePart = new Intl.DateTimeFormat(lo, { year: "numeric", month: "short", day: "2-digit" }).format(
          new Date(`${b.date}T12:00:00`)
        );
        return `${datePart} · ${b.time}${b.endTime ? `–${b.endTime}` : ""}`;
      } catch {
        return `${b.date} · ${b.time || ""}`.trim();
      }
    })();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:py-10">
      <Link href={`${base}/book`} className="text-sm text-muted-foreground transition hover:text-foreground">
        ← {t("portal.profile.back")}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("portal.profile.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("portal.profile.subtitle")}</p>
      </div>

      {loading ? (
        <Card className="border-border/70 bg-card/50 shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">{t("portal.book.loading")}</CardContent>
        </Card>
      ) : profileData ? (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("portal.profile.section.profile")}
            </h2>
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("portal.profile.fullName")}</p>
                    <p className="mt-1 font-medium">{fullName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("portal.profile.memberSince")}</p>
                    <p className="mt-1 font-medium">{memberSince || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("portal.profile.category")}</p>
                    <p className="mt-1 font-medium">{profileData.membership?.categoryName || t("portal.profile.allCategories")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("portal.profile.email")}</p>
                    <p className="mt-1 font-medium text-foreground/90">{email || "—"}</p>
                  </div>
                </div>

                <form className="space-y-3 border-t border-border/60 pt-4" onSubmit={save}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("portal.profile.editSection")}
                  </p>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("portal.profile.fullName")}
                    autoComplete="name"
                    className="bg-background/80"
                  />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("portal.profile.phone")}
                    autoComplete="tel"
                    className="bg-background/80"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
                  >
                    {t("common.save")}
                  </button>
                </form>
                {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("portal.profile.section.stats")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t("portal.profile.stat.total"), value: profileData.stats?.totalBookings ?? 0 },
                { label: t("portal.profile.stat.completed"), value: profileData.stats?.completedBookings ?? 0 },
                { label: t("portal.profile.stat.upcoming"), value: profileData.stats?.upcomingBookings ?? 0 },
                { label: t("portal.profile.stat.lastBooking"), value: lastBookingLabel || t("portal.profile.lastBookingNone") }
              ].map((s) => (
                <Card key={s.label} className="border-border/70 bg-muted/10 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="mt-2 text-lg font-semibold tabular-nums sm:text-2xl">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("portal.profile.section.upcoming")}
              </h2>
              <Card className="border-border/70 bg-card/80 shadow-sm">
                <CardContent className="max-h-[320px] space-y-2 overflow-y-auto p-4">
                  {profileData.upcomingBookings?.length ? (
                    profileData.upcomingBookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {b.date} ·{" "}
                            <span className="font-mono tabular-nums">
                              {b.time}
                              {b.endTime ? `–${b.endTime}` : ""}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{b.service}</p>
                          {b.publicLessonNote ? (
                            <p className="mt-2 text-xs text-foreground/85">
                              <span className="font-medium">Lesson note:</span> {b.publicLessonNote}
                            </p>
                          ) : null}
                        </div>
                        <StatusBadge value={b.status} />
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("portal.profile.empty.upcoming")}</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("portal.profile.section.past")}
              </h2>
              <Card className="border-border/70 bg-card/80 shadow-sm">
                <CardContent className="max-h-[320px] space-y-2 overflow-y-auto p-4">
                  {profileData.pastBookings?.length ? (
                    profileData.pastBookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {b.date} ·{" "}
                            <span className="font-mono tabular-nums">
                              {b.time}
                              {b.endTime ? `–${b.endTime}` : ""}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{b.service}</p>
                        </div>
                        <StatusBadge value={b.status} />
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("portal.profile.empty.past")}</p>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("portal.profile.section.notes")}
            </h2>
            <Card className="border-primary/30 bg-primary/5 shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("portal.profile.notesTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("portal.profile.notesHint")}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {profileData.publicNotes?.length ? (
                  profileData.publicNotes.map((n) => (
                    <div key={n.id} className="rounded-xl border border-primary/20 bg-background/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{n.title || t("portal.profile.noteFallback")}</p>
                        {n.is_pinned ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            {t("portal.profile.pinned")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{n.content}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {(() => {
                          try {
                            return new Intl.DateTimeFormat(lo, { dateStyle: "medium", timeStyle: "short" }).format(
                              new Date(n.created_at)
                            );
                          } catch {
                            return String(n.created_at || "");
                          }
                        })()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border/70 bg-muted/5 px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("portal.profile.empty.notes")}
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <Card className="border-border/70">
          <CardContent className="p-6 text-sm text-muted-foreground">{t("portal.profile.loadFailed")}</CardContent>
        </Card>
      )}
    </div>
  );
}

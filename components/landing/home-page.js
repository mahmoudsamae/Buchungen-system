"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarRange,
  Check,
  Globe2,
  Layers3,
  Play,
  Sparkles,
  Users
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageToggle } from "@/components/i18n/language-toggle";

function FeatureCard({ icon: Icon, title, body }) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm transition hover:border-primary/25 hover:shadow-md">
      <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function PricingCard({ name, price, desc, features, highlight, popularLabel }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
        highlight
          ? "border-primary/40 bg-gradient-to-b from-primary/10 to-card ring-1 ring-primary/20"
          : "border-border/60 bg-card/60"
      }`}
    >
      {highlight ? (
        <span className="absolute -top-3 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          {popularLabel}
        </span>
      ) : null}
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-1 text-sm font-medium text-primary">{price}</p>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [demoLoading, setDemoLoading] = useState(false);

  const goDemo = () => {
    setDemoLoading(true);
    setTimeout(() => router.push("/choose-role"), 260);
  };

  const features = [
    {
      icon: Globe2,
      title: t("landing.features.portal.title"),
      body: t("landing.features.portal.body")
    },
    {
      icon: CalendarRange,
      title: t("landing.features.schedule.title"),
      body: t("landing.features.schedule.body")
    },
    {
      icon: Building2,
      title: t("landing.features.dashboard.title"),
      body: t("landing.features.dashboard.body")
    },
    {
      icon: Layers3,
      title: t("landing.features.dual.title"),
      body: t("landing.features.dual.body")
    },
    {
      icon: CalendarRange,
      title: t("landing.features.calendar.title"),
      body: t("landing.features.calendar.body")
    },
    {
      icon: BarChart3,
      title: t("landing.features.analytics.title"),
      body: t("landing.features.analytics.body")
    },
    {
      icon: Users,
      title: t("landing.features.multi.title"),
      body: t("landing.features.multi.body")
    }
  ];

  const steps = [
    { title: t("landing.how.1.title"), body: t("landing.how.1.body") },
    { title: t("landing.how.2.title"), body: t("landing.how.2.body") },
    { title: t("landing.how.3.title"), body: t("landing.how.3.body") },
    { title: t("landing.how.4.title"), body: t("landing.how.4.body") }
  ];

  const why = [t("landing.why.1"), t("landing.why.2"), t("landing.why.3"), t("landing.why.4")];

  const faq = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") }
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.22),transparent)]" />
      <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-info/20 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-primary/15 blur-[100px]" />

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <span className="text-sm font-semibold tracking-tight">BookFlow</span>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/business/login"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
            >
              {t("landing.hero.ctaBusiness")}
            </Link>
            <button
              type="button"
              onClick={goDemo}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm sm:text-sm"
            >
              {t("landing.hero.ctaDemo")}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 md:grid-cols-2 md:gap-16 md:px-6 md:pt-16 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("landing.badge")}
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">
              {t("landing.hero.title")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{t("landing.hero.subtitle")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={goDemo}
                disabled={demoLoading}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-info px-6 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_12px_40px_rgba(59,130,246,0.28)] transition hover:brightness-110 disabled:opacity-80"
              >
                <Play className="h-4 w-4" aria-hidden />
                {demoLoading ? t("common.loading") : t("landing.hero.ctaDemo")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </button>
              <Link
                href="/business/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border/80 bg-card/80 px-6 text-sm font-semibold shadow-sm backdrop-blur transition hover:bg-muted/80"
              >
                {t("landing.hero.ctaBusiness")}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-info/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur">
              <p className="text-sm font-semibold">{t("landing.hero.previewTitle")}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">{t("landing.hero.previewToday")}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">24</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">{t("landing.hero.previewPending")}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">3</p>
                </div>
                <div className="col-span-2 rounded-xl border border-dashed border-primary/25 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">{t("landing.hero.previewCaption")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-t border-border/50 bg-muted/20 py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.features.title")}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("landing.features.subtitle")}</p>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.how.title")}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("landing.how.subtitle")}</p>
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.title} className="relative rounded-2xl border border-border/60 bg-card/40 p-5">
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border/50 bg-muted/15 py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.why.title")}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("landing.why.subtitle")}</p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {why.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 rounded-xl border border-border/50 bg-card/50 p-4 text-sm leading-relaxed"
                >
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.pricing.title")}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("landing.pricing.subtitle")}</p>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              <PricingCard
                name={t("landing.pricing.trial.name")}
                price={t("landing.pricing.trial.price")}
                desc={t("landing.pricing.trial.desc")}
                features={[t("landing.pricing.trial.f1"), t("landing.pricing.trial.f2")]}
              />
              <PricingCard
                highlight
                name={t("landing.pricing.core.name")}
                price={t("landing.pricing.core.price")}
                desc={t("landing.pricing.core.desc")}
                features={[
                  t("landing.pricing.core.f1"),
                  t("landing.pricing.core.f2"),
                  t("landing.pricing.core.f3"),
                  t("landing.pricing.core.f4")
                ]}
              />
              <PricingCard
                name={t("landing.pricing.pro.name")}
                price={t("landing.pricing.pro.price")}
                desc={t("landing.pricing.pro.desc")}
                features={[
                  t("landing.pricing.pro.f1"),
                  t("landing.pricing.pro.f2"),
                  t("landing.pricing.pro.f3"),
                  t("landing.pricing.pro.f4"),
                  t("landing.pricing.pro.f5")
                ]}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-border/50 bg-muted/20 py-20">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">{t("landing.faq.title")}</h2>
            <div className="mt-8 space-y-4">
              {faq.map((item) => (
                <div key={item.q} className="rounded-2xl border border-border/60 bg-card/60 p-5">
                  <p className="font-medium">{item.q}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-4xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card px-6 py-14 text-center shadow-lg md:px-12">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.cta.title")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("landing.cta.subtitle")}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goDemo}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md"
              >
                {t("landing.hero.ctaDemo")}
              </button>
              <Link
                href="/business/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold"
              >
                {t("landing.hero.ctaBusiness")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/30 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 md:flex-row md:items-start md:justify-between md:px-6">
          <div>
            <p className="text-sm font-semibold">BookFlow</p>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">Premium scheduling for modern teams.</p>
          </div>
            <div className="flex flex-wrap gap-8 text-sm">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("landing.footer.product")}</span>
                <Link href="#features" className="text-muted-foreground hover:text-foreground">
                  {t("landing.footer.features")}
                </Link>
                <Link href="/choose-role" className="text-muted-foreground hover:text-foreground">
                  {t("landing.footer.testNow")}
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("landing.footer.pricing")}</span>
                <Link href="#pricing" className="text-muted-foreground hover:text-foreground">
                  {t("landing.footer.pricing")}
                </Link>
                <Link href="/business/login" className="text-muted-foreground hover:text-foreground">
                  {t("landing.footer.businessLogin")}
                </Link>
              </div>
            </div>
        </div>
      </footer>
    </div>
  );
}

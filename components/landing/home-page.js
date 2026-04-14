"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarRange,
  Check,
  CircleCheck,
  Globe2,
  Layers3,
  ListOrdered,
  Loader2,
  LogIn,
  Mail,
  MessageCircle,
  Play,
  Send,
  Sparkles,
  User,
  Users
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useLanguage } from "@/components/i18n/language-provider";
import { Input } from "@/components/ui/input";
import { ManagerDialog } from "@/components/manager/dialog";
import {
  platformOwnerLoginPath,
  schoolLoginMarketingPath
} from "@/lib/auth/tenant-login-urls";

function FeatureCard({ icon: Icon, title, body }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/50 p-6 shadow-md shadow-black/20 ring-1 ring-white/[0.04] transition duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/15">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative mb-4 inline-flex rounded-xl bg-primary/12 p-3 text-primary ring-1 ring-primary/20 transition group-hover:bg-primary/18">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="relative text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground/95">{body}</p>
    </div>
  );
}

function PricingCard({ name, price, desc, features, highlight, popularLabel }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] transition duration-300 hover:-translate-y-0.5 ${
        highlight
          ? "border-primary/45 bg-gradient-to-b from-primary/[0.14] via-card/90 to-card ring-primary/25 hover:shadow-primary/10"
          : "border-border/50 bg-gradient-to-b from-card/95 to-card/60 hover:border-border/80 hover:shadow-xl"
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
  const { t, locale } = useLanguage();
  const schoolLoginHref = schoolLoginMarketingPath();
  const platformLoginHref = platformOwnerLoginPath();
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    teamSize: "",
    requestType: "",
    message: ""
  });
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const contactSuccessText =
    locale === "de"
      ? "Danke! Ich melde mich in Kürze persönlich bei Ihnen."
      : "Thank you! Your message has been sent successfully. I will get back to you shortly.";

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
    <div className="relative min-h-screen overflow-x-hidden selection:bg-primary/20 selection:text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-18%,hsl(var(--primary)/0.26),transparent_55%)]" />
      <div className="pointer-events-none absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full bg-info/18 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-primary/12 blur-[110px]" />

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 shadow-sm shadow-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 md:px-6">
          <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-sm font-semibold tracking-tight text-transparent">
            BookFlow
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={schoolLoginHref}
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/80 px-3.5 py-2 text-xs font-semibold text-foreground shadow-md shadow-black/15 ring-1 ring-white/[0.04] transition hover:border-primary/35 hover:bg-muted/40 sm:text-sm"
            >
              <LogIn className="h-3.5 w-3.5 text-primary" aria-hidden />
              Login
            </Link>
            <Link
              href={platformLoginHref}
              className="hidden text-xs font-medium text-muted-foreground/75 transition hover:text-foreground md:inline"
            >
              Platform Login
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-14 md:grid-cols-2 md:gap-16 md:px-6 md:pt-16 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary shadow-sm shadow-primary/10 ring-1 ring-primary/15">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("landing.badge")}
            </span>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-6xl">
              {t("landing.hero.title")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground/95 md:text-lg">{t("landing.hero.subtitle")}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href={schoolLoginHref}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary to-info px-6 text-sm font-semibold text-primary-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_14px_48px_hsl(var(--primary)/0.28)] transition hover:brightness-[1.06] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.5),0_18px_56px_hsl(var(--primary)/0.32)]"
              >
                <Play className="h-4 w-4 opacity-95" aria-hidden />
                {t("landing.hero.ctaDemo")}
                <ArrowRight className="h-4 w-4 opacity-80 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setContactError("");
                  setContactSuccess("");
                  setContactSubmitting(false);
                  setContactOpen(true);
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/90 px-6 text-sm font-semibold text-foreground shadow-md shadow-black/20 ring-1 ring-white/[0.05] backdrop-blur-sm transition hover:border-primary/25 hover:bg-muted/50"
              >
                <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
                Kontakt
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/25 via-transparent to-info/18 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/95 to-card/70 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.06] backdrop-blur-md">
              <p className="text-sm font-semibold tracking-tight text-foreground">{t("landing.hero.previewTitle")}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/45 bg-muted/35 p-4 shadow-inner shadow-black/10">
                  <p className="text-xs text-muted-foreground">{t("landing.hero.previewToday")}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">24</p>
                </div>
                <div className="rounded-xl border border-border/45 bg-muted/35 p-4 shadow-inner shadow-black/10">
                  <p className="text-xs text-muted-foreground">{t("landing.hero.previewPending")}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">3</p>
                </div>
                <div className="col-span-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.07] p-4 ring-1 ring-primary/10">
                  <p className="text-xs font-medium text-muted-foreground">{t("landing.hero.previewCaption")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-t border-border/40 bg-gradient-to-b from-muted/25 to-muted/10 py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t("landing.features.title")}</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground/95">{t("landing.features.subtitle")}</p>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t("landing.how.title")}</h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground/95">{t("landing.how.subtitle")}</p>
            <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li
                  key={s.title}
                  className="relative rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/45 p-5 shadow-md shadow-black/15 ring-1 ring-white/[0.04] transition hover:border-primary/20"
                >
                  <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-sm font-bold text-primary ring-1 ring-primary/20">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground/95">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/12 py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t("landing.why.title")}</h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground/95">{t("landing.why.subtitle")}</p>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2">
              {why.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 rounded-xl border border-border/50 bg-card/55 p-4 text-sm leading-relaxed shadow-sm shadow-black/10 ring-1 ring-white/[0.03]"
                >
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                  <span className="text-foreground/95">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t("landing.pricing.title")}</h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground/95">{t("landing.pricing.subtitle")}</p>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
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

        <section className="border-t border-border/40 bg-gradient-to-b from-muted/20 to-background py-24">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">{t("landing.faq.title")}</h2>
            <div className="mt-10 space-y-4">
              {faq.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-border/50 bg-card/70 p-5 shadow-md shadow-black/15 ring-1 ring-white/[0.04]"
                >
                  <p className="font-medium text-foreground">{item.q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground/95">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-4xl rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.12] via-card to-card px-6 py-14 text-center shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.05] md:px-12">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t("landing.cta.title")}</h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground/95">{t("landing.cta.subtitle")}</p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href={schoolLoginHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-105"
              >
                <Play className="h-4 w-4" aria-hidden />
                {t("landing.hero.ctaDemo")}
              </Link>
              <Link
                href={schoolLoginHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/90 px-6 text-sm font-semibold text-foreground shadow-md shadow-black/15 ring-1 ring-white/[0.04] transition hover:border-primary/30 hover:bg-muted/40"
              >
                <LogIn className="h-4 w-4 text-primary" aria-hidden />
                {t("landing.hero.ctaBusiness")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-gradient-to-b from-card/40 to-background py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 md:flex-row md:items-start md:justify-between md:px-6">
          <div>
            <p className="text-sm font-semibold text-foreground">BookFlow</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground/90">Premium scheduling for modern teams.</p>
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
                <Link href={schoolLoginHref} className="text-muted-foreground hover:text-foreground">
                  {t("landing.footer.businessLogin")}
                </Link>
                <Link href={platformLoginHref} className="text-muted-foreground hover:text-foreground">
                  {t("landing.header.platformLogin")}
                </Link>
              </div>
            </div>
        </div>
      </footer>

      <ManagerDialog open={contactOpen} onClose={() => setContactOpen(false)} wide flush hideTitle>
        <div className="grid lg:grid-cols-12">
          <div className="border-b border-border/40 px-6 py-8 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:border-border/40">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 shadow-inner shadow-black/20 ring-1 ring-primary/25">
                <MessageCircle className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {locale === "de" ? "Kontakt & Demo" : "Contact & Demo"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground/95">
                  {locale === "de"
                    ? "Erzählen Sie mir kurz, wie Sie Ihre Termine und Abläufe organisieren möchten. Ich prüfe Ihre Anfrage persönlich und melde mich in Kürze bei Ihnen. Unverbindlich und ohne Zahlung."
                    : "Tell me briefly how you want to organize scheduling and operations. I will review your request personally and get back to you shortly. No commitment and no payment required."}
                </p>
              </div>
            </div>

            <form
              className="mt-8 space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                setContactError("");
                setContactSuccess("");
                const name = contactForm.name.trim();
                const email = contactForm.email.trim();
                const company = contactForm.company.trim();
                const phone = contactForm.phone.trim();
                const teamSize = contactForm.teamSize.trim();
                const requestType = contactForm.requestType.trim();
                const message = contactForm.message.trim();
                if (!name || !email || !message) {
                  const msg =
                    locale === "de"
                      ? "Bitte Name, E-Mail und Nachricht ausfüllen."
                      : "Please fill in name, email, and message.";
                  setContactError(msg);
                  toast.error(msg);
                  return;
                }
                const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                if (!emailOk) {
                  const msg =
                    locale === "de" ? "Bitte geben Sie eine gültige E-Mail-Adresse ein." : "Please enter a valid email address.";
                  setContactError(msg);
                  toast.error(msg);
                  return;
                }
                setContactSubmitting(true);
                try {
                  const res = await fetch("/api/contact", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name,
                      email,
                      company,
                      phone,
                      teamSize,
                      requestType,
                      message
                    })
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    const fallback =
                      locale === "de"
                        ? "Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut."
                        : "Your message could not be sent. Please try again later.";
                    let msg = typeof data.error === "string" ? data.error : fallback;
                    if (locale === "de") {
                      const map = {
                        "Name, email, and message are required.": "Bitte Name, E-Mail und Nachricht ausfüllen.",
                        "Please enter a valid email address.": "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
                        "Invalid request body.": "Ungültige Anfrage.",
                        "Email service is not configured.":
                          "E-Mail-Versand ist derzeit nicht konfiguriert. Bitte versuchen Sie es später erneut."
                      };
                      if (map[msg]) msg = map[msg];
                    }
                    setContactError(msg);
                    toast.error(msg);
                    return;
                  }
                  setContactSuccess(contactSuccessText);
                  toast.success(contactSuccessText);
                } catch {
                  const msg =
                    locale === "de"
                      ? "Netzwerkfehler. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut."
                      : "Network error. Please check your connection and try again.";
                  setContactError(msg);
                  toast.error(msg);
                } finally {
                  setContactSubmitting(false);
                }
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <User className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {locale === "de" ? "Ihre Angaben" : "Your details"}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    className="h-11 rounded-xl border-border/50 bg-background/50"
                    placeholder={locale === "de" ? "Name" : "Name"}
                    value={contactForm.name}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <Input
                    type="email"
                    className="h-11 rounded-xl border-border/50 bg-background/50"
                    placeholder="Email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <Input
                  className="h-11 rounded-xl border-border/50 bg-background/50"
                  placeholder={locale === "de" ? "Firma / Schule (optional)" : "Company / School (optional)"}
                  value={contactForm.company}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, company: e.target.value }))}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    className="h-11 rounded-xl border-border/50 bg-background/50"
                    placeholder={locale === "de" ? "Telefon (optional)" : "Phone (optional)"}
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    className="h-11 rounded-xl border-border/50 bg-background/50"
                    placeholder={locale === "de" ? "Teamgröße (optional)" : "Team size (optional)"}
                    value={contactForm.teamSize}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, teamSize: e.target.value }))}
                  />
                </div>
                <Input
                  className="h-11 rounded-xl border-border/50 bg-background/50"
                  placeholder={locale === "de" ? "Wobei brauchen Sie Hilfe? (optional)" : "What do you need help with? (optional)"}
                  value={contactForm.requestType}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, requestType: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {locale === "de" ? "Nachricht" : "Message"}
                </div>
                <textarea
                  className="scrollbar-premium min-h-[128px] w-full rounded-xl border border-border/50 bg-background/50 px-3 py-3 text-sm leading-relaxed text-foreground ring-0 placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  placeholder={locale === "de" ? "Ihre Nachricht" : "Your message"}
                  value={contactForm.message}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                  required
                />
              </div>

              {contactError ? <p className="text-sm text-destructive">{contactError}</p> : null}
              {contactSuccess ? (
                <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                  <p className="leading-relaxed">{contactSuccess}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-border/30 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground/85">
                  {locale === "de"
                    ? "Antwort in der Regel innerhalb eines Werktags."
                    : "We typically reply within one business day."}
                </p>
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-60"
                >
                  {contactSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                  {contactSubmitting
                    ? locale === "de"
                      ? "Wird gesendet…"
                      : "Sending…"
                    : locale === "de"
                      ? "Demo anfragen"
                      : "Request demo"}
                </button>
              </div>
            </form>
          </div>

          <div className="relative flex flex-col bg-gradient-to-b from-muted/30 via-muted/15 to-transparent px-6 py-8 sm:px-8 lg:col-span-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,hsl(var(--primary)/0.12),transparent_65%)]" />
            <div className="relative flex flex-1 flex-col">
              <div className="flex items-center gap-2 text-primary">
                <ListOrdered className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                  {locale === "de" ? "So läuft es ab" : "What happens next"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground/95">
                {locale === "de"
                  ? "Transparent und ohne Verpflichtung — so begleiten wir Ihre Anfrage."
                  : "Transparent and commitment-free — here is how we follow up."}
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {(
                  locale === "de"
                    ? [
                        "Sie senden Ihre Anfrage",
                        "Ich prüfe, ob BookFlow zu Ihrem Ablauf passt",
                        "Ich melde mich per E-Mail bei Ihnen",
                        "Bei Interesse vereinbaren wir eine kurze Demo"
                      ]
                    : [
                        "You send your request",
                        "I review whether BookFlow fits your workflow",
                        "I get back to you by email",
                        "If it fits, we schedule a short demo"
                      ]
                ).map((line, i) => (
                  <li
                    key={line}
                    className="flex gap-3 rounded-xl border border-border/45 bg-card/55 px-3.5 py-3 text-sm leading-snug text-foreground/95 shadow-sm shadow-black/20 ring-1 ring-white/[0.04]"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/20">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ManagerDialog>

      <Toaster richColors position="bottom-right" theme="dark" closeButton />
    </div>
  );
}

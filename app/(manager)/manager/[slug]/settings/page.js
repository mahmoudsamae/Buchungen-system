"use client";

import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { BusinessSettingsForm } from "@/components/manager/business-settings-form";
import { useManager } from "@/components/manager/provider";
import { SchoolSettingsSetupLinks } from "@/components/school/school-settings-setup-links";

export default function BusinessSettingsPage() {
  const { business } = useManager();
  const { t } = useLanguage();
  const basePath = business?.slug ? `/manager/${business.slug}` : "";

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.settings.subtitle")} />
      <BusinessSettingsForm />
      {basePath ? (
        <div className="mx-auto max-w-4xl px-4 pb-16 md:px-6">
          <SchoolSettingsSetupLinks basePath={basePath} />
        </div>
      ) : null}
    </>
  );
}

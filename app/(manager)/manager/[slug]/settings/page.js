"use client";

import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { BusinessSettingsForm } from "@/components/manager/business-settings-form";
import { useManager } from "@/components/manager/provider";

export default function BusinessSettingsPage() {
  const { business } = useManager();
  const { t } = useLanguage();

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.settings.subtitle")} />
      <BusinessSettingsForm />
    </>
  );
}

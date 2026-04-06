"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useManager } from "@/components/manager/provider";
import { QRCodeSVG } from "qrcode.react";

export default function BookingLinkPage() {
  const { business } = useManager();
  const { t } = useLanguage();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const portalUrl = useMemo(() => {
    if (!origin || !business?.slug) return "";
    return `${origin}/portal/${business.slug}/login`;
  }, [origin, business?.slug]);

  const copy = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
  };

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.bookingLink.subtitle")} />
      <main className="space-y-4 p-4 pb-10 md:p-6 md:pb-12">
        <Card>
          <CardHeader>
            <CardTitle>Portal URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="break-all rounded-md border bg-muted/30 p-3 font-mono text-xs">{portalUrl || "Loading…"}</p>
            <button type="button" onClick={copy} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Copy link
            </button>
            <p className="text-xs text-muted-foreground">
              Customers must be invited by you with an email + password before they can sign in. They only see this business after login.
            </p>
          </CardContent>
        </Card>
        {portalUrl ? (
          <Card>
            <CardHeader>
              <CardTitle>QR code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
              <div className="rounded-lg border bg-white p-3">
                <QRCodeSVG value={portalUrl} size={180} />
              </div>
              <p className="text-xs text-muted-foreground">Scan opens the customer login page.</p>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </>
  );
}

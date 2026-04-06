"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/i18n/language-provider";

export default function PortalProfilePage() {
  const { slug } = useParams();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq("id", user.id);
    setMsg(error ? error.message : "Saved.");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href={`/portal/${slug}/book`} className="text-sm text-muted-foreground transition hover:text-foreground">
        ← {t("portal.profile.back")}
      </Link>
      <Card className="mt-4 space-y-3 p-5">
        <h1 className="text-lg font-semibold">{t("portal.profile.title")}</h1>
        <form className="space-y-3" onSubmit={save}>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("portal.profile.fullName")}
            autoComplete="name"
          />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("portal.profile.phone")}
            autoComplete="tel"
          />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            {t("common.save")}
          </button>
        </form>
        {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      </Card>
    </div>
  );
}

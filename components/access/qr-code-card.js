"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrCodeCard({ value, caption }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-zinc-950/40 p-4">
      <div className="rounded-lg bg-white p-2 shadow-inner">
        <QRCodeSVG value={value} size={168} level="M" includeMargin={false} />
      </div>
      {caption ? <p className="text-center text-[11px] text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

"use client";

import { useState } from "react";

export function CopyLinkButton({ text, label = "Copy link", copiedLabel = "Copied" }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-border/80 bg-muted/30 px-3 text-xs font-semibold text-foreground transition hover:bg-muted/50"
    >
      {done ? copiedLabel : label}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Searchable category picker — dark SaaS styling, keyboard-friendly basics (Escape closes).
 */
export function CategoryCombobox({
  categories,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  noResultsLabel,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => String(c.name).toLowerCase().includes(q));
  }, [categories, query]);

  const selected = useMemo(() => categories.find((c) => c.id === value) || null, [categories, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    },
    []
  );

  return (
    <div ref={rootRef} className={cn("relative", className)} onKeyDown={onKeyDown}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-background/80 px-3 text-left text-sm text-foreground shadow-sm transition",
          "border-border/80 hover:border-border",
          disabled && "cursor-not-allowed opacity-60",
          ariaInvalid && "border-destructive/80 ring-1 ring-destructive/25"
        )}
      >
        <span className={cn("min-w-0 truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-[10001] mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl ring-1 ring-border/40"
        >
          <div className="border-b border-border/50 p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 rounded-lg border-border/60 bg-muted/20 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">{noResultsLabel}</p>
            ) : (
              filtered.map((c) => {
                const active = c.id === value;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex w-full rounded-lg px-2.5 py-2 text-left text-sm transition",
                      active ? "bg-primary/15 font-medium text-foreground" : "text-foreground hover:bg-muted/60"
                    )}
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    {c.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { cn } from "@/lib/utils";

export function Switch({ id, checked, onCheckedChange, disabled, className, ...rest }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-border/80 bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        checked && "border-primary/40 bg-primary/90",
        className
      )}
      {...rest}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 translate-x-0.5 rounded-full bg-card shadow-sm ring-1 ring-border/50 transition",
          checked && "translate-x-5 bg-primary-foreground"
        )}
      />
    </button>
  );
}

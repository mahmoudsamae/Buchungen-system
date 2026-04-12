import { Card } from "@/components/ui/card";

/**
 * Shared layout for tenant-scoped login pages (school manager, teacher).
 * Does not perform auth — only presentation.
 */
export function RoleLoginShell({ eyebrow, title, description, badge, children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.45))]" />
      <Card className="relative z-[1] w-full max-w-md space-y-5 border-border/60 bg-zinc-900/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-md">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">{eyebrow}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {badge ? (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </Card>
    </div>
  );
}

import { Input } from "@/components/ui/input";

export function Topbar({ title, subtitle, showSearch = true }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {showSearch ? <Input className="max-w-xs" placeholder="Search..." /> : null}
      </div>
    </header>
  );
}

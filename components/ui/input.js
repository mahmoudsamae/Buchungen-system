import { cn } from "@/lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border bg-card px-3 text-sm outline-none ring-primary placeholder:text-muted-foreground focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

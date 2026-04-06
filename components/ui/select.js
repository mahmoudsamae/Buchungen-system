import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border bg-card px-3 text-sm outline-none ring-primary focus:ring-2",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

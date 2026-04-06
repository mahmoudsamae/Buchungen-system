import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-card shadow-soft transition-shadow hover:shadow-card", className)} {...props} />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("border-b p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-4", className)} {...props} />;
}

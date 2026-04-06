import { cn } from "@/lib/utils";

const toneClasses = {
  default: "bg-muted text-foreground",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-danger/20 text-danger",
  info: "bg-info/20 text-info"
};

export function Badge({ className, tone = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

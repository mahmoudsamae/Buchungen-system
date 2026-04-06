import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-muted text-foreground hover:bg-muted/80",
  outline: "border border-border bg-transparent hover:bg-muted",
  ghost: "bg-transparent hover:bg-muted",
  danger: "bg-danger text-white hover:opacity-90"
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base"
};

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50",
    variants[variant],
    sizes[size],
    className
  );
  return <button className={classes} {...props} />;
}

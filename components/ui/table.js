import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }) {
  return <thead className={cn("bg-muted/60", className)} {...props} />;
}

export function TBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TR({ className, ...props }) {
  return <tr className={cn("border-b hover:bg-muted/40", className)} {...props} />;
}

export function TH({ className, ...props }) {
  return <th className={cn("px-3 py-2 text-left font-medium text-muted-foreground", className)} {...props} />;
}

export function TD({ className, ...props }) {
  return <td className={cn("px-3 py-2", className)} {...props} />;
}

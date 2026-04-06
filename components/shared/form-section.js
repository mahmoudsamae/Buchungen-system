export function FormSection({ title, description, children }) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

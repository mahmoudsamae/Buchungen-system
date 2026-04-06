export function Drawer({ title, children }) {
  return (
    <aside className="fixed right-0 top-0 z-40 hidden h-full w-full max-w-md border-l bg-card p-4 shadow-card lg:block">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </aside>
  );
}

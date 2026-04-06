import { Topbar } from "@/components/navigation/topbar";
import { EmptyState } from "@/components/shared/empty-state";

export default function PlansPage() {
  return (
    <>
      <Topbar title="Plans & Billing" subtitle="Placeholder for future module" />
      <main className="p-4 md:p-6">
        <EmptyState
          title="Plans and billing are not included in V1"
          description="This section is intentionally scoped as a placeholder."
          ctaLabel="Create placeholder plan"
        />
      </main>
    </>
  );
}

import { business } from "@/lib/mock-data";
import { PublicHeader } from "@/components/navigation/public-header";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader businessName={business.name} />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}

import Link from "next/link";
import { ServiceCard } from "@/components/booking/service-card";
import { getServicesBySlug } from "@/lib/mock-data";

export default function ServiceSelectionPage({ params }) {
  const services = getServicesBySlug(params.slug);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Select a service</h1>
      <div className="space-y-3">
        {services.filter((item) => item.active).map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
      <Link href="time" className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Continue
      </Link>
    </div>
  );
}

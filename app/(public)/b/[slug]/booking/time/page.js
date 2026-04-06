import Link from "next/link";
import { SlotPicker } from "@/components/booking/slot-picker";
import { getBookedSlotsBySlug, getBusinessBySlug, getSlotGroupsBySlug } from "@/lib/mock-data";

export default function TimeSelectionPage({ params }) {
  const business = getBusinessBySlug(params.slug);
  const slotGroups = getSlotGroupsBySlug(params.slug);
  const bookedSlots = getBookedSlotsBySlug(params.slug);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Choose date and time</h1>
        <p className="text-sm text-muted-foreground">Date: Apr 03, 2026</p>
        <p className="text-sm text-muted-foreground">Timezone: {business.timezone}</p>
      </div>
      <SlotPicker slotGroups={slotGroups} bookedSlots={bookedSlots} />
      <Link href="../details" className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Continue
      </Link>
    </div>
  );
}

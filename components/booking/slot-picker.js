import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SlotPicker({ slotGroups, bookedSlots = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Times</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {slotGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs uppercase text-muted-foreground">{group.label}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {group.slots.map((slot) => {
                const isBooked = bookedSlots.includes(slot);
                return (
                  <Button key={slot} variant="outline" className="w-full" disabled={isBooked}>
                    {slot} {isBooked ? "(Booked)" : ""}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

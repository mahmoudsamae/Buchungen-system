import { describe, expect, it } from "vitest";
import { intersectWindows } from "@/lib/booking/teacher-availability-windows";

describe("intersectWindows", () => {
  it("returns empty when business has no windows (outer loop), even if teacher has windows", () => {
    expect(
      intersectWindows([], [
        { start_time: "09:00", end_time: "17:00" }
      ])
    ).toEqual([]);
  });

  it("intersects when both sides have windows", () => {
    expect(
      intersectWindows(
        [{ start_time: "08:00", end_time: "12:00" }],
        [{ start_time: "10:00", end_time: "18:00" }]
      )
    ).toEqual([{ start_time: "10:00", end_time: "12:00" }]);
  });
});

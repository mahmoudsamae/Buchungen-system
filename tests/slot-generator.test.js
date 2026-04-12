import { describe, expect, it } from "vitest";
import { compareHHMM, generateLessonSlotsWithBuffer } from "@/lib/teacher/slot-generator";

describe("generateLessonSlotsWithBuffer", () => {
  it("generates 90-minute blocks from 09:00 to 15:00", () => {
    const slots = generateLessonSlotsWithBuffer("09:00", "15:00", 90, 0);
    expect(slots).toEqual([
      { start: "09:00", end: "10:30" },
      { start: "10:30", end: "12:00" },
      { start: "12:00", end: "13:30" },
      { start: "13:30", end: "15:00" }
    ]);
  });

  it("respects buffer between slots", () => {
    const slots = generateLessonSlotsWithBuffer("09:00", "12:00", 60, 15);
    expect(slots).toEqual([
      { start: "09:00", end: "10:00" },
      { start: "10:15", end: "11:15" }
    ]);
  });

  it("returns empty for invalid range", () => {
    expect(generateLessonSlotsWithBuffer("15:00", "09:00", 60, 0)).toEqual([]);
  });
});

describe("compareHHMM", () => {
  it("orders times", () => {
    expect(compareHHMM("09:00", "10:00")).toBeLessThan(0);
    expect(compareHHMM("10:00", "10:00")).toBe(0);
  });
});

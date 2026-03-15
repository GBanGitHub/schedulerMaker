import { describe, it, expect } from "vitest";
import { generateSchedule } from "../src/scheduler";
import { createTimeSlots, markSlotsAsBlocked, findValidSlots } from "../src/slots";
import type { ScheduleInput, BlockInput, GivenInput, ScheduleConstraints } from "../src/types";

const DATE = new Date("2025-03-15T00:00:00");

const defaultConstraints: ScheduleConstraints = {
  dayStartTime: "07:00",
  dayEndTime: "22:00",
  minBreakMinutes: 0,
  slotDurationMinutes: 15,
};

function makeBlock(overrides: Partial<BlockInput> = {}): BlockInput {
  return {
    id: "block-1",
    name: "Test Block",
    duration: 60,
    category: "general",
    color: "#3B82F6",
    ...overrides,
  };
}

function makeGiven(startHour: number, endHour: number): GivenInput {
  return {
    id: `given-${startHour}-${endHour}`,
    name: `Given ${startHour}-${endHour}`,
    startTime: new Date(`2025-03-15T${String(startHour).padStart(2, "0")}:00:00`),
    endTime: new Date(`2025-03-15T${String(endHour).padStart(2, "0")}:00:00`),
  };
}

describe("createTimeSlots", () => {
  it("should create correct number of 15-min slots from 7am to 10pm", () => {
    const slots = createTimeSlots(DATE, "07:00", "22:00", 15);
    // 15 hours * 4 slots/hour = 60 slots
    expect(slots).toHaveLength(60);
    expect(slots[0].start.getHours()).toBe(7);
    expect(slots[0].start.getMinutes()).toBe(0);
    expect(slots[59].end.getHours()).toBe(22);
  });

  it("should create correct number of 30-min slots", () => {
    const slots = createTimeSlots(DATE, "09:00", "17:00", 30);
    // 8 hours * 2 slots/hour = 16 slots
    expect(slots).toHaveLength(16);
  });

  it("should initialize all slots as unblocked", () => {
    const slots = createTimeSlots(DATE, "07:00", "22:00", 15);
    expect(slots.every((s) => !s.blocked && s.usedBy === null)).toBe(true);
  });
});

describe("markSlotsAsBlocked", () => {
  it("should block slots that overlap with given time range", () => {
    const slots = createTimeSlots(DATE, "07:00", "22:00", 15);
    const blockStart = new Date("2025-03-15T09:00:00");
    const blockEnd = new Date("2025-03-15T10:00:00");

    markSlotsAsBlocked(slots, blockStart, blockEnd);

    // Slots from 9:00 to 10:00 should be blocked (4 slots)
    const blocked = slots.filter((s) => s.blocked);
    expect(blocked).toHaveLength(4);
    expect(blocked[0].start.getHours()).toBe(9);
    expect(blocked[0].start.getMinutes()).toBe(0);
    expect(blocked[3].end.getHours()).toBe(10);
  });

  it("should not block slots outside the given range", () => {
    const slots = createTimeSlots(DATE, "07:00", "22:00", 15);
    markSlotsAsBlocked(
      slots,
      new Date("2025-03-15T09:00:00"),
      new Date("2025-03-15T10:00:00")
    );

    // 7:00 - 9:00 slots should not be blocked
    const earlySlots = slots.filter(
      (s) => s.start.getHours() < 9 && !s.blocked
    );
    expect(earlySlots.length).toBeGreaterThan(0);
  });
});

describe("findValidSlots", () => {
  it("should find valid slots for a 1-hour block", () => {
    const slots = createTimeSlots(DATE, "07:00", "22:00", 15);
    const block = makeBlock({ duration: 60 });
    const validSlots = findValidSlots(slots, block, [], defaultConstraints);

    // Should have many valid placements
    expect(validSlots.length).toBeGreaterThan(0);
    // First valid slot should start at 7:00
    expect(slots[validSlots[0].startIndex].start.getHours()).toBe(7);
  });

  it("should not place block in blocked slots", () => {
    const slots = createTimeSlots(DATE, "07:00", "22:00", 15);
    // Block 7:00 - 8:00
    markSlotsAsBlocked(
      slots,
      new Date("2025-03-15T07:00:00"),
      new Date("2025-03-15T08:00:00")
    );

    const block = makeBlock({ duration: 60 });
    const validSlots = findValidSlots(slots, block, [], defaultConstraints);

    // First valid slot should start at 8:00 (after blocked period)
    expect(slots[validSlots[0].startIndex].start.getHours()).toBe(8);
  });

  it("should respect morning time preference", () => {
    const slots = createTimeSlots(DATE, "07:00", "22:00", 15);
    const block = makeBlock({
      duration: 60,
      constraints: { timePreference: "morning" },
    });

    const validSlots = findValidSlots(slots, block, [], defaultConstraints);

    // All valid slots should be before noon
    for (const vs of validSlots) {
      expect(slots[vs.endIndex].end.getHours()).toBeLessThanOrEqual(12);
    }
  });

  it("should respect evening time preference", () => {
    const slots = createTimeSlots(DATE, "07:00", "22:00", 15);
    const block = makeBlock({
      duration: 60,
      constraints: { timePreference: "evening" },
    });

    const validSlots = findValidSlots(slots, block, [], defaultConstraints);

    // All valid slots should start at 5pm or later
    for (const vs of validSlots) {
      expect(slots[vs.startIndex].start.getHours()).toBeGreaterThanOrEqual(17);
    }
  });

  it("should return empty array when no valid slots exist", () => {
    const slots = createTimeSlots(DATE, "09:00", "10:00", 15);
    // Only 1 hour available
    const block = makeBlock({ duration: 120 }); // 2 hour block

    const validSlots = findValidSlots(slots, block, [], defaultConstraints);
    expect(validSlots).toHaveLength(0);
  });
});

describe("generateSchedule", () => {
  it("should schedule a single block in available time", () => {
    const input: ScheduleInput = {
      date: DATE,
      blocks: [makeBlock()],
      givens: [],
      constraints: defaultConstraints,
    };

    const result = generateSchedule(input);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].startTime.getHours()).toBe(7);
    expect(result.blocks[0].endTime.getHours()).toBe(8);
    expect(result.unscheduledBlocks).toHaveLength(0);
  });

  it("should not overlap with givens", () => {
    const input: ScheduleInput = {
      date: DATE,
      blocks: [makeBlock({ id: "gym", name: "Gym" })],
      givens: [makeGiven(7, 9)], // Given blocks 7-9am
      constraints: defaultConstraints,
    };

    const result = generateSchedule(input);
    expect(result.blocks).toHaveLength(1);
    // Block should be after the given (9am or later)
    expect(result.blocks[0].startTime.getHours()).toBeGreaterThanOrEqual(9);
  });

  it("should schedule multiple blocks without overlap", () => {
    const input: ScheduleInput = {
      date: DATE,
      blocks: [
        makeBlock({ id: "1", name: "Block A", duration: 60 }),
        makeBlock({ id: "2", name: "Block B", duration: 60 }),
        makeBlock({ id: "3", name: "Block C", duration: 60 }),
      ],
      givens: [],
      constraints: defaultConstraints,
    };

    const result = generateSchedule(input);
    expect(result.blocks).toHaveLength(3);

    // Verify no overlaps
    for (let i = 0; i < result.blocks.length - 1; i++) {
      expect(result.blocks[i].endTime.getTime()).toBeLessThanOrEqual(
        result.blocks[i + 1].startTime.getTime()
      );
    }
  });

  it("should respect existing events in RESPECT_EXISTING mode", () => {
    const input: ScheduleInput = {
      date: DATE,
      blocks: [makeBlock()],
      givens: [],
      existingEvents: [
        {
          id: "event-1",
          summary: "Meeting",
          start: new Date("2025-03-15T07:00:00"),
          end: new Date("2025-03-15T09:00:00"),
        },
      ],
      syncMode: "RESPECT_EXISTING",
      constraints: defaultConstraints,
    };

    const result = generateSchedule(input);
    expect(result.blocks[0].startTime.getHours()).toBeGreaterThanOrEqual(9);
  });

  it("should mark blocks as unscheduled when they cannot fit", () => {
    const input: ScheduleInput = {
      date: DATE,
      blocks: [makeBlock({ id: "big", name: "Big Block", duration: 480 })], // 8 hours
      givens: [makeGiven(7, 15)], // Given blocks 7am - 3pm (8 hours)
      constraints: {
        ...defaultConstraints,
        dayStartTime: "07:00",
        dayEndTime: "17:00", // Only 10 hours total, 8 blocked
      },
    };

    const result = generateSchedule(input);
    // 2 hours available (3pm-5pm) but block needs 8 hours
    expect(result.blocks).toHaveLength(0);
    expect(result.unscheduledBlocks).toHaveLength(1);
    expect(result.unscheduledBlocks[0].name).toBe("Big Block");
  });

  it("should schedule blocks around multiple givens", () => {
    const input: ScheduleInput = {
      date: DATE,
      blocks: [
        makeBlock({ id: "1", name: "Morning", duration: 60, constraints: { timePreference: "morning" } }),
        makeBlock({ id: "2", name: "Afternoon", duration: 60, constraints: { timePreference: "afternoon" } }),
      ],
      givens: [
        makeGiven(10, 11), // 10-11am given
        makeGiven(14, 15), // 2-3pm given
      ],
      constraints: defaultConstraints,
    };

    const result = generateSchedule(input);
    expect(result.blocks).toHaveLength(2);

    const morning = result.blocks.find((b) => b.name === "Morning")!;
    const afternoon = result.blocks.find((b) => b.name === "Afternoon")!;

    expect(morning.startTime.getHours()).toBeLessThan(12);
    expect(afternoon.startTime.getHours()).toBeGreaterThanOrEqual(12);
  });

  it("should handle break time between blocks", () => {
    const input: ScheduleInput = {
      date: DATE,
      blocks: [
        makeBlock({ id: "1", name: "A", duration: 60 }),
        makeBlock({ id: "2", name: "B", duration: 60 }),
      ],
      givens: [],
      constraints: {
        ...defaultConstraints,
        minBreakMinutes: 15,
      },
    };

    const result = generateSchedule(input);
    expect(result.blocks).toHaveLength(2);

    const gap =
      result.blocks[1].startTime.getTime() - result.blocks[0].endTime.getTime();
    expect(gap).toBeGreaterThanOrEqual(15 * 60 * 1000); // 15 minutes in ms
  });
});

import { addMinutes } from "date-fns";
import type {
  ScheduleInput,
  ScheduleOutput,
  ScheduledBlock,
} from "./types";
import { createTimeSlots, markSlotsAsBlocked, findValidSlots, markSlotsAsUsed } from "./slots";
import { SchedulingError } from "./errors";

export function generateSchedule(input: ScheduleInput): ScheduleOutput {
  const {
    date,
    blocks,
    givens,
    existingEvents,
    syncMode,
    constraints,
  } = input;

  const slots = createTimeSlots(
    date,
    constraints.dayStartTime,
    constraints.dayEndTime,
    constraints.slotDurationMinutes
  );

  if (slots.length === 0) {
    throw new SchedulingError("No time slots available for the given day range");
  }

  // Block off Givens
  for (const given of givens) {
    markSlotsAsBlocked(slots, given.startTime, given.endTime);
  }

  // Block off existing Google Calendar events (if RESPECT_EXISTING mode)
  if (syncMode === "RESPECT_EXISTING" && existingEvents) {
    for (const event of existingEvents) {
      markSlotsAsBlocked(slots, event.start, event.end);
    }
  }

  const scheduledBlocks: ScheduledBlock[] = [];
  const unscheduledBlocks = [];

  for (const block of blocks) {
    const validSlots = findValidSlots(slots, block, scheduledBlocks, constraints);

    if (validSlots.length === 0) {
      unscheduledBlocks.push(block);
      continue;
    }

    // Pick earliest valid slot
    const selected = validSlots[0];
    const startTime = slots[selected.startIndex].start;
    const endTime = addMinutes(startTime, block.duration);

    scheduledBlocks.push({
      blockId: block.id,
      name: block.name,
      category: block.category,
      color: block.color,
      startTime,
      endTime,
    });

    markSlotsAsUsed(slots, selected.startIndex, selected.endIndex, block.id);
  }

  return {
    date,
    blocks: scheduledBlocks,
    unscheduledBlocks,
  };
}

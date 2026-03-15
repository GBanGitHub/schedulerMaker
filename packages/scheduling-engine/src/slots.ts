import { addMinutes, setHours, setMinutes, isAfter, isBefore, isEqual } from "date-fns";
import type { TimeSlot, BlockInput, ScheduledBlock, ScheduleConstraints } from "./types";

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

export function createTimeSlots(
  date: Date,
  startTime: string,
  endTime: string,
  slotDurationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  let current = setMinutes(setHours(new Date(date), start.hours), start.minutes);
  current.setSeconds(0, 0);

  const endDate = setMinutes(setHours(new Date(date), end.hours), end.minutes);
  endDate.setSeconds(0, 0);

  while (isBefore(current, endDate)) {
    const slotEnd = addMinutes(current, slotDurationMinutes);
    if (isAfter(slotEnd, endDate)) break;

    slots.push({
      start: new Date(current),
      end: new Date(slotEnd),
      blocked: false,
      usedBy: null,
    });

    current = slotEnd;
  }

  return slots;
}

export function markSlotsAsBlocked(
  slots: TimeSlot[],
  blockStart: Date,
  blockEnd: Date
): void {
  for (const slot of slots) {
    // Slot overlaps with blocked period if slot.start < blockEnd AND slot.end > blockStart
    if (isBefore(slot.start, blockEnd) && isAfter(slot.end, blockStart)) {
      slot.blocked = true;
    }
  }
}

function getTimePreferenceRange(
  preference: "morning" | "afternoon" | "evening",
  date: Date
): { start: Date; end: Date } {
  const d = new Date(date);
  d.setSeconds(0, 0);

  switch (preference) {
    case "morning":
      return {
        start: setMinutes(setHours(d, 5), 0),
        end: setMinutes(setHours(d, 12), 0),
      };
    case "afternoon":
      return {
        start: setMinutes(setHours(d, 12), 0),
        end: setMinutes(setHours(d, 17), 0),
      };
    case "evening":
      return {
        start: setMinutes(setHours(d, 17), 0),
        end: setMinutes(setHours(d, 23), 0),
      };
  }
}

export function findValidSlots(
  slots: TimeSlot[],
  block: BlockInput,
  scheduledBlocks: ScheduledBlock[],
  constraints: ScheduleConstraints
): { startIndex: number; endIndex: number }[] {
  const slotsNeeded = Math.ceil(block.duration / constraints.slotDurationMinutes);
  const validRanges: { startIndex: number; endIndex: number }[] = [];
  const date = slots[0]?.start;

  if (!date) return [];

  // Check time preference
  let preferenceRange: { start: Date; end: Date } | null = null;
  if (block.constraints?.timePreference) {
    preferenceRange = getTimePreferenceRange(block.constraints.timePreference, date);
  }

  for (let i = 0; i <= slots.length - slotsNeeded; i++) {
    let valid = true;

    // Check consecutive slots are all free
    for (let j = 0; j < slotsNeeded; j++) {
      if (slots[i + j].blocked || slots[i + j].usedBy !== null) {
        valid = false;
        break;
      }
    }

    if (!valid) continue;

    const rangeStart = slots[i].start;
    const rangeEnd = slots[i + slotsNeeded - 1].end;

    // Check time preference
    if (preferenceRange) {
      if (isBefore(rangeStart, preferenceRange.start) || isAfter(rangeEnd, preferenceRange.end)) {
        continue;
      }
    }

    // Check minimum break from last scheduled block
    if (constraints.minBreakMinutes > 0 && scheduledBlocks.length > 0) {
      const hasBreakConflict = scheduledBlocks.some((scheduled) => {
        const breakAfter = addMinutes(scheduled.endTime, constraints.minBreakMinutes);
        const breakBefore = addMinutes(scheduled.startTime, -constraints.minBreakMinutes);
        // New block starts during break after existing, or ends during break before existing
        return (
          (isAfter(rangeStart, scheduled.endTime) || isEqual(rangeStart, scheduled.endTime)) &&
          isBefore(rangeStart, breakAfter)
        ) || (
          isAfter(rangeEnd, breakBefore) &&
          (isBefore(rangeEnd, scheduled.startTime) || isEqual(rangeEnd, scheduled.startTime))
        );
      });

      if (hasBreakConflict) continue;
    }

    validRanges.push({ startIndex: i, endIndex: i + slotsNeeded - 1 });
  }

  return validRanges;
}

export function markSlotsAsUsed(
  slots: TimeSlot[],
  startIndex: number,
  endIndex: number,
  blockId: string
): void {
  for (let i = startIndex; i <= endIndex; i++) {
    slots[i].usedBy = blockId;
  }
}

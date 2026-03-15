export interface TimeSlot {
  start: Date;
  end: Date;
  blocked: boolean;
  usedBy: string | null; // blockId
}

export interface BlockInput {
  id: string;
  name: string;
  duration: number; // minutes
  category: string;
  color: string;
  constraints?: BlockConstraints;
}

export interface BlockConstraints {
  timePreference?: "morning" | "afternoon" | "evening";
  maxPerDay?: number;
}

export interface GivenInput {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
}

export interface ExternalEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
}

export type SyncMode = "RESPECT_EXISTING" | "OVERWRITE";

export interface ScheduleConstraints {
  dayStartTime: string; // "HH:mm"
  dayEndTime: string; // "HH:mm"
  minBreakMinutes: number;
  slotDurationMinutes: number;
}

export interface ScheduleInput {
  date: Date;
  blocks: BlockInput[];
  givens: GivenInput[];
  existingEvents?: ExternalEvent[];
  syncMode?: SyncMode;
  constraints: ScheduleConstraints;
}

export interface ScheduledBlock {
  blockId: string;
  name: string;
  category: string;
  color: string;
  startTime: Date;
  endTime: Date;
}

export interface ScheduleOutput {
  date: Date;
  blocks: ScheduledBlock[];
  unscheduledBlocks: BlockInput[];
}

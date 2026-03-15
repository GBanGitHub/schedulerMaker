import { z } from "zod";

export const blockSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  duration: z.number().int().min(5, "Min 5 minutes").max(480, "Max 8 hours"),
  category: z.string().min(1).default("general"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color").default("#3B82F6"),
  description: z.string().max(500).optional(),
  constraints: z
    .object({
      timePreference: z.enum(["morning", "afternoon", "evening"]).optional(),
      maxPerDay: z.number().int().min(1).optional(),
    })
    .optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
});

export const templateBlockSchema = z.object({
  blockId: z.string().min(1),
  order: z.number().int().min(0),
  customDuration: z.number().int().min(5).optional(),
});

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const givenSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  startTime: z.string().regex(timeRegex, "Must be HH:mm format"),
  endTime: z.string().regex(timeRegex, "Must be HH:mm format"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color").default("#10B981"),
  recurrence: z.string().optional(),
});

export const dateGivenSchema = z.object({
  givenId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(timeRegex, "Must be HH:mm format"),
  endTime: z.string().regex(timeRegex, "Must be HH:mm format"),
});

export const generateScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templateId: z.string().min(1),
  syncMode: z.enum(["RESPECT_EXISTING", "OVERWRITE"]).default("RESPECT_EXISTING"),
});

export const generateBatchSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templateId: z.string().min(1),
  syncMode: z.enum(["RESPECT_EXISTING", "OVERWRITE"]).default("RESPECT_EXISTING"),
});

export const updateUserSchema = z.object({
  timezone: z.string().min(1).optional(),
  dayStartTime: z.string().regex(timeRegex, "Must be HH:mm format").optional(),
  dayEndTime: z.string().regex(timeRegex, "Must be HH:mm format").optional(),
  defaultBreakMins: z.number().int().min(0).max(120).optional(),
});

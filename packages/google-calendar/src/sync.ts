import { prisma } from "@schedule-maker/database";
import { createEvent, deleteEvent, fetchEvents } from "./client";
import type { GoogleTokens } from "./types";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function publishScheduleToGoogle(
  scheduleId: string,
  mode: "RESPECT_EXISTING" | "OVERWRITE",
  tokens: GoogleTokens,
  calendarId: string
) {
  const schedule = await prisma.schedule.findUniqueOrThrow({
    where: { id: scheduleId },
    include: { blocks: true },
  });

  if (mode === "OVERWRITE") {
    // Delete existing events created by our app for this day
    const existingBlocks = schedule.blocks.filter((b) => b.googleEventId);
    for (const block of existingBlocks) {
      try {
        await deleteEvent(tokens, calendarId, block.googleEventId!);
      } catch {
        // Event may already be deleted
      }
    }
  }

  const results: { blockId: string; googleEventId: string }[] = [];

  for (const scheduleBlock of schedule.blocks) {
    if (mode === "RESPECT_EXISTING") {
      const events = await fetchEvents(
        tokens,
        calendarId,
        scheduleBlock.startTime,
        scheduleBlock.endTime
      );
      if (events.length > 0) continue; // Skip conflicting blocks
    }

    const googleEventId = await createEvent(tokens, calendarId, {
      summary: scheduleBlock.name,
      start: scheduleBlock.startTime,
      end: scheduleBlock.endTime,
    });

    await prisma.scheduleBlock.update({
      where: { id: scheduleBlock.id },
      data: { googleEventId },
    });

    results.push({ blockId: scheduleBlock.id, googleEventId });
  }

  await prisma.schedule.update({
    where: { id: scheduleId },
    data: { syncedToGoogle: true, googleCalendarId: calendarId },
  });

  return results;
}

export async function importEventsAsGivens(
  userId: string,
  tokens: GoogleTokens,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
) {
  const events = await fetchEvents(tokens, calendarId, timeMin, timeMax);

  const results = [];
  for (const event of events) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const startTime = `${String(eventStart.getHours()).padStart(2, "0")}:${String(eventStart.getMinutes()).padStart(2, "0")}`;
    const endTime = `${String(eventEnd.getHours()).padStart(2, "0")}:${String(eventEnd.getMinutes()).padStart(2, "0")}`;

    // Create or find a reusable Given
    let given = await prisma.given.findFirst({
      where: { userId, googleEventId: event.id },
    });

    if (!given) {
      given = await prisma.given.create({
        data: {
          userId,
          name: event.summary,
          startTime,
          endTime,
          googleEventId: event.id,
          googleCalendarId: calendarId,
        },
      });
    }

    // Place it on the specific date
    const dateGiven = await prisma.dateGiven.upsert({
      where: {
        givenId_date: {
          givenId: given.id,
          date: startOfDay(eventStart),
        },
      },
      update: { startTime, endTime },
      create: {
        userId,
        givenId: given.id,
        date: startOfDay(eventStart),
        startTime,
        endTime,
      },
    });

    results.push({ given, dateGiven });
  }

  return results;
}

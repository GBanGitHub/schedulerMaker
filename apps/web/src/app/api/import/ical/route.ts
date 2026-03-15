import { NextRequest, NextResponse } from "next/server";
import type { VEvent } from "node-ical";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const { url, dateFrom, dateTo } = await req.json();

  if (!url || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "url, dateFrom, dateTo required" }, { status: 400 });
  }

  const from = new Date(dateFrom + "T00:00:00");
  const to = new Date(dateTo + "T23:59:59");

  // Fetch iCal feed server-side (avoids CORS)
  const response = await fetch(url);
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch iCal URL" }, { status: 502 });
  }
  const text = await response.text();

  const ical = await import("node-ical");
  const parsed = ical.parseICS(text);

  let imported = 0;
  let skipped = 0;

  for (const key of Object.keys(parsed)) {
    const component = parsed[key];
    if (!component || component.type !== "VEVENT") continue;

    const event = component as VEvent;

    const dtstart = event.start;
    if (!dtstart) { skipped++; continue; }

    const eventDate = new Date(dtstart);
    if (eventDate < from || eventDate > to) { skipped++; continue; }

    const eventEnd = event.end ? new Date(event.end) : new Date(eventDate.getTime() + 60 * 60 * 1000);

    const rawSummary = event.summary;
    const summary = typeof rawSummary === "string"
      ? rawSummary
      : (rawSummary as { val: string } | undefined)?.val ?? "Untitled";
    const startTime = toHHmm(eventDate);
    const endTime = toHHmm(eventEnd);

    // Reuse existing Given with the same name, or create one
    let given = await prisma.given.findFirst({
      where: { userId: user.id, name: summary },
    });

    if (!given) {
      given = await prisma.given.create({
        data: {
          userId: user.id,
          name: summary,
          startTime,
          endTime,
        },
      });
    }

    // Place on the specific date (upsert — idempotent)
    await prisma.dateGiven.upsert({
      where: {
        givenId_date: {
          givenId: given.id,
          date: startOfDay(eventDate),
        },
      },
      update: { startTime, endTime },
      create: {
        userId: user.id,
        givenId: given.id,
        date: startOfDay(eventDate),
        startTime,
        endTime,
      },
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}

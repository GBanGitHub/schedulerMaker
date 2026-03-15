import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";

function toIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcalText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json({ error: "start and end query params required" }, { status: 400 });
    }

    const startDate = new Date(start + "T00:00:00.000Z");
    const endDate = new Date(end + "T23:59:59.999Z");

    const schedules = await prisma.schedule.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate, lte: endDate },
      },
      include: { blocks: { orderBy: { startTime: "asc" } } },
    });

    const now = toIcalDate(new Date());
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ScheduleMaker//EN",
      "CALSCALE:GREGORIAN",
    ];

    for (const schedule of schedules) {
      for (const block of schedule.blocks) {
        lines.push(
          "BEGIN:VEVENT",
          `UID:${block.id}@schedulemaker`,
          `DTSTAMP:${now}`,
          `DTSTART:${toIcalDate(block.startTime)}`,
          `DTEND:${toIcalDate(block.endTime)}`,
          `SUMMARY:${escapeIcalText(block.name)}`,
          "END:VEVENT"
        );
      }
    }

    lines.push("END:VCALENDAR");

    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

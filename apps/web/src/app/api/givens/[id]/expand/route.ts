import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { RRule } from "rrule";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { startDate, endDate } = body as { startDate: string; endDate: string };

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
    }

    const given = await prisma.given.findFirst({ where: { id, userId: user.id } });
    if (!given) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!given.recurrence) {
      return NextResponse.json({ error: "Given has no recurrence rule" }, { status: 400 });
    }

    const rule = RRule.fromString(given.recurrence);
    const start = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T23:59:59Z");
    const occurrences = rule.between(start, end, true);

    let created = 0;
    let skipped = 0;

    for (const occ of occurrences) {
      // Normalize to midnight UTC for the date field
      const date = new Date(
        Date.UTC(occ.getUTCFullYear(), occ.getUTCMonth(), occ.getUTCDate())
      );

      try {
        await prisma.dateGiven.create({
          data: {
            userId: user.id,
            givenId: given.id,
            date,
            startTime: given.startTime,
            endTime: given.endTime,
          },
        });
        created++;
      } catch {
        // Unique constraint violation means it already exists — skip
        skipped++;
      }
    }

    return NextResponse.json({ created, skipped });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

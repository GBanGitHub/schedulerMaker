import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { generateBatchSchema } from "@/lib/validations";
import { generateSchedule } from "@schedule-maker/scheduling-engine";
import type { BlockInput, GivenInput } from "@schedule-maker/scheduling-engine";
import { startOfDay, addDays, format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = generateBatchSchema.parse(body);

    // Fetch template once for all dates
    const template = await prisma.template.findFirst({
      where: { id: data.templateId, userId: user.id },
      include: {
        templateBlocks: {
          include: { block: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const blockInputs: BlockInput[] = template.templateBlocks.map((tb) => ({
      id: tb.block.id,
      name: tb.block.name,
      duration: tb.customDuration || tb.block.duration,
      category: tb.block.category,
      color: tb.block.color,
      constraints: tb.block.constraints as any,
    }));

    // Build date range
    const dates: Date[] = [];
    let cur = new Date(data.startDate + "T12:00:00");
    const endDate = new Date(data.endDate + "T12:00:00");
    while (cur <= endDate) {
      dates.push(new Date(cur));
      cur = addDays(cur, 1);
    }

    const results: Array<{
      date: string;
      scheduleId?: string;
      unscheduledBlocks: number;
      error?: string;
    }> = [];

    for (const date of dates) {
      const dateStr = format(date, "yyyy-MM-dd");
      try {
        const dayStart = startOfDay(date);

        const dateGivens = await prisma.dateGiven.findMany({
          where: { userId: user.id, date: dayStart },
          include: { given: true },
        });

        const givenInputs: GivenInput[] = dateGivens.map((dg) => {
          const [sh, sm] = dg.startTime.split(":").map(Number);
          const [eh, em] = dg.endTime.split(":").map(Number);
          const start = new Date(dayStart);
          start.setHours(sh, sm, 0, 0);
          const end = new Date(dayStart);
          end.setHours(eh, em, 0, 0);
          return {
            id: dg.given.id,
            name: dg.given.name,
            startTime: start,
            endTime: end,
            priority: (dg.given as any).priority ?? 0,
          };
        });

        const result = generateSchedule({
          date,
          blocks: blockInputs,
          givens: givenInputs,
          syncMode: data.syncMode as any,
          constraints: {
            dayStartTime: user.dayStartTime,
            dayEndTime: user.dayEndTime,
            minBreakMinutes: user.defaultBreakMins,
            slotDurationMinutes: 15,
          },
        });

        const schedule = await prisma.schedule.upsert({
          where: { userId_date: { userId: user.id, date: dayStart } },
          update: {
            templateId: template.id,
            syncedToGoogle: false,
            blocks: {
              deleteMany: {},
              create: result.blocks.map((b) => ({
                blockId: b.blockId,
                startTime: b.startTime,
                endTime: b.endTime,
                name: b.name,
                color: b.color,
                category: b.category,
              })),
            },
          },
          create: {
            userId: user.id,
            templateId: template.id,
            date: dayStart,
            blocks: {
              create: result.blocks.map((b) => ({
                blockId: b.blockId,
                startTime: b.startTime,
                endTime: b.endTime,
                name: b.name,
                color: b.color,
                category: b.category,
              })),
            },
          },
        });

        results.push({
          date: dateStr,
          scheduleId: schedule.id,
          unscheduledBlocks: result.unscheduledBlocks.length,
        });
      } catch (err: any) {
        results.push({
          date: dateStr,
          unscheduledBlocks: 0,
          error: err.message ?? "Unknown error",
        });
      }
    }

    const succeeded = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => !!r.error).length;

    return NextResponse.json({ results, total: results.length, succeeded, failed });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

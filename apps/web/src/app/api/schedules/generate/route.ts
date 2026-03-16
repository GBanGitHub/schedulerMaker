import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { generateScheduleSchema } from "@/lib/validations";
import { generateSchedule } from "@schedule-maker/scheduling-engine";
import type { BlockInput, GivenInput } from "@schedule-maker/scheduling-engine";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = generateScheduleSchema.parse(body);
    const date = new Date(data.date);

    // Fetch template with blocks
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

    // Fetch DateGivens for the target date (with given details)
    const dateGivens = await prisma.dateGiven.findMany({
      where: {
        userId: user.id,
        date: startOfDay(date),
      },
      include: { given: true },
    });

    // Convert to scheduling engine input
    const blockInputs: BlockInput[] = template.templateBlocks.map((tb) => ({
      id: tb.block.id,
      name: tb.block.name,
      duration: tb.customDuration || tb.block.duration,
      category: tb.block.category,
      color: tb.block.color,
      constraints: tb.block.constraints as any,
    }));

    // Convert HH:mm strings + target date → full Date objects
    const dayStart = startOfDay(date);
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

    // Generate schedule
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

    // Save schedule to database
    const schedule = await prisma.schedule.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: startOfDay(date),
        },
      },
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
        date: startOfDay(date),
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
      include: {
        blocks: { orderBy: { startTime: "asc" } },
      },
    });

    return NextResponse.json({
      schedule,
      unscheduledBlocks: result.unscheduledBlocks,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.name === "SchedulingError") {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Schedule generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
    }

    const start = new Date(startDate + "T00:00:00.000Z");
    const end = new Date(endDate + "T23:59:59.999Z");

    const schedules = await prisma.schedule.findMany({
      where: {
        userId: user.id,
        date: { gte: start, lte: end },
      },
      include: {
        blocks: true,
      },
    });

    // Group by category
    const categoryMap = new Map<string, { minutes: number; blockCount: number; color: string }>();

    for (const schedule of schedules) {
      for (const block of schedule.blocks) {
        const mins = Math.round(
          (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000
        );
        const existing = categoryMap.get(block.category);
        if (existing) {
          existing.minutes += mins;
          existing.blockCount += 1;
        } else {
          categoryMap.set(block.category, { minutes: mins, blockCount: 1, color: block.color });
        }
      }
    }

    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.minutes - a.minutes);

    const totalMinutes = categories.reduce((sum, c) => sum + c.minutes, 0);
    const totalDays = schedules.length;

    return NextResponse.json({ categories, totalMinutes, totalDays });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    const where: any = { userId: user.id };
    if (dateStr) {
      const date = new Date(dateStr);
      where.date = startOfDay(date);
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        blocks: { orderBy: { startTime: "asc" } },
        template: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(schedules);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

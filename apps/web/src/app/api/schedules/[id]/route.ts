import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const schedule = await prisma.schedule.findFirst({
      where: { id, userId: user.id },
      include: {
        blocks: { orderBy: { startTime: "asc" } },
        template: true,
      },
    });
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(schedule);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await prisma.schedule.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

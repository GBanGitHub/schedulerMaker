import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const original = await prisma.template.findFirst({
      where: { id, userId: user.id },
      include: { templateBlocks: true },
    });

    if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const clone = await prisma.template.create({
      data: {
        userId: user.id,
        name: `${original.name} (Copy)`,
        description: original.description,
        templateBlocks: {
          create: original.templateBlocks.map((tb) => ({
            blockId: tb.blockId,
            order: tb.order,
            customDuration: tb.customDuration,
          })),
        },
      },
      include: {
        templateBlocks: {
          include: { block: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(clone, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { templateSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const template = await prisma.template.findFirst({
      where: { id, userId: user.id },
      include: {
        templateBlocks: {
          include: { block: true },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { blocks: blockItems, ...templateData } = body;
    const data = templateSchema.partial().parse(templateData);

    // Update template and replace blocks if provided
    const template = await prisma.$transaction(async (tx) => {
      const existing = await tx.template.findFirst({ where: { id, userId: user.id } });
      if (!existing) return null;

      if (blockItems) {
        await tx.templateBlock.deleteMany({ where: { templateId: id } });
        await tx.templateBlock.createMany({
          data: blockItems.map((b: { blockId: string; order: number; customDuration?: number }) => ({
            templateId: id,
            blockId: b.blockId,
            order: b.order,
            customDuration: b.customDuration,
          })),
        });
      }

      return tx.template.update({
        where: { id },
        data,
        include: {
          templateBlocks: {
            include: { block: true },
            orderBy: { order: "asc" },
          },
        },
      });
    });

    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await prisma.template.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

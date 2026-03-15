import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { templateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await requireUser();
    const templates = await prisma.template.findMany({
      where: { userId: user.id },
      include: {
        templateBlocks: {
          include: { block: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { blocks: blockItems, ...templateData } = body;
    const data = templateSchema.parse(templateData);

    const template = await prisma.template.create({
      data: {
        ...data,
        userId: user.id,
        templateBlocks: blockItems?.length
          ? {
              create: blockItems.map((b: { blockId: string; order: number; customDuration?: number }) => ({
                blockId: b.blockId,
                order: b.order,
                customDuration: b.customDuration,
              })),
            }
          : undefined,
      },
      include: {
        templateBlocks: {
          include: { block: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
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

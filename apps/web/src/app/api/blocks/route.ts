import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { blockSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await requireUser();
    const blocks = await prisma.block.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(blocks);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = blockSchema.parse(body);

    const block = await prisma.block.create({
      data: { ...data, userId: user.id },
    });

    return NextResponse.json(block, { status: 201 });
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

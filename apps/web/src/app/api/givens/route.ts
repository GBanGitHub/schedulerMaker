import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { givenSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await requireUser();
    const givens = await prisma.given.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(givens);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = givenSchema.parse(body);

    const given = await prisma.given.create({
      data: {
        userId: user.id,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color,
        recurrence: data.recurrence ?? null,
      },
    });

    return NextResponse.json(given, { status: 201 });
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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { dateGivenSchema } from "@/lib/validations";
import { startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "date query param required" }, { status: 400 });
    }

    const dateGivens = await prisma.dateGiven.findMany({
      where: {
        userId: user.id,
        date: startOfDay(new Date(dateStr)),
      },
      include: { given: true },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(dateGivens);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = dateGivenSchema.parse(body);

    // Verify the given belongs to the user
    const given = await prisma.given.findFirst({
      where: { id: data.givenId, userId: user.id },
    });
    if (!given) {
      return NextResponse.json({ error: "Given not found" }, { status: 404 });
    }

    const dateGiven = await prisma.dateGiven.upsert({
      where: {
        givenId_date: {
          givenId: data.givenId,
          date: startOfDay(new Date(data.date)),
        },
      },
      update: {
        startTime: data.startTime,
        endTime: data.endTime,
      },
      create: {
        userId: user.id,
        givenId: data.givenId,
        date: startOfDay(new Date(data.date)),
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });

    return NextResponse.json(dateGiven, { status: 201 });
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

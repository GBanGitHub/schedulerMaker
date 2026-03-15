import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { updateUserSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      timezone: user.timezone,
      dayStartTime: user.dayStartTime,
      dayEndTime: user.dayEndTime,
      defaultBreakMins: user.defaultBreakMins,
      hasGoogleCalendar: !!(user.accessToken && user.refreshToken),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        timezone: true,
        dayStartTime: true,
        dayEndTime: true,
        defaultBreakMins: true,
      },
    });

    return NextResponse.json(updated);
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

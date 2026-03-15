import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";
import { publishScheduleToGoogle } from "@schedule-maker/google-calendar";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const schedule = await prisma.schedule.findFirst({
      where: { id, userId: user.id },
    });
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!user.accessToken || !user.refreshToken || !user.tokenExpiry) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    if (user.tokenExpiry < new Date()) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }

    const results = await publishScheduleToGoogle(
      id,
      body.mode || "RESPECT_EXISTING",
      {
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        tokenExpiry: user.tokenExpiry,
      },
      body.calendarId || "primary"
    );

    return NextResponse.json({ success: true, published: results.length });
  } catch (error: any) {
    console.error("Publish error:", error);
    return NextResponse.json({ error: error.message || "Failed to publish" }, { status: 500 });
  }
}

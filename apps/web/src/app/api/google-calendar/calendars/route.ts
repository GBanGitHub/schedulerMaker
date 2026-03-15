import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listCalendars } from "@schedule-maker/google-calendar";

export async function GET() {
  try {
    const user = await requireUser();

    if (!user.accessToken || !user.refreshToken || !user.tokenExpiry) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    if (user.tokenExpiry < new Date()) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }

    const calendars = await listCalendars({
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      tokenExpiry: user.tokenExpiry,
    });

    return NextResponse.json({ calendars });
  } catch (error: any) {
    console.error("List calendars error:", error);
    return NextResponse.json({ error: error.message || "Failed to list calendars" }, { status: 500 });
  }
}

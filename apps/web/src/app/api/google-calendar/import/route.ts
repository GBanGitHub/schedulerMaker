import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { importEventsAsGivens } from "@schedule-maker/google-calendar";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    if (!user.accessToken || !user.refreshToken || !user.tokenExpiry) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    if (user.tokenExpiry < new Date()) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }

    const givens = await importEventsAsGivens(
      user.id,
      {
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        tokenExpiry: user.tokenExpiry,
      },
      body.calendarId || "primary",
      new Date(body.timeMin),
      new Date(body.timeMax)
    );

    return NextResponse.json({ imported: givens.length, givens });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message || "Failed to import" }, { status: 500 });
  }
}

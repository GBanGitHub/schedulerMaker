import { NextResponse } from "next/server";
import { prisma } from "@schedule-maker/database";
import { requireUser } from "@/lib/session";

export async function POST() {
  try {
    const user = await requireUser();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

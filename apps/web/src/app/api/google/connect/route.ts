import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireUser } from "@/lib/session";
import crypto from "crypto";

export async function GET() {
  try {
    const user = await requireUser();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/google/callback`
    );

    // Sign user ID with NEXTAUTH_SECRET for CSRF protection
    const hmac = crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET!);
    hmac.update(user.id);
    const signature = hmac.digest("hex");
    const state = `${user.id}.${signature}`;

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      state,
    });

    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?google=error`
    );
  }
}

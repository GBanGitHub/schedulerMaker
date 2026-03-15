import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@schedule-maker/database";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL!;

  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/settings?google=error`);
    }

    // Verify state signature
    const [userId, signature] = state.split(".");
    if (!userId || !signature) {
      return NextResponse.redirect(`${baseUrl}/settings?google=error`);
    }

    const hmac = crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET!);
    hmac.update(userId);
    const expected = hmac.digest("hex");

    if (signature !== expected) {
      return NextResponse.redirect(`${baseUrl}/settings?google=error`);
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    await prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });

    return NextResponse.redirect(`${baseUrl}/settings?google=connected`);
  } catch {
    return NextResponse.redirect(`${baseUrl}/settings?google=error`);
  }
}

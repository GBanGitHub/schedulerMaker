import { google } from "googleapis";
import type { CalendarEvent, CalendarList, GoogleTokens } from "./types";

export function createCalendarClient(tokens: GoogleTokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.tokenExpiry.getTime(),
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function listCalendars(tokens: GoogleTokens): Promise<CalendarList[]> {
  const calendar = createCalendarClient(tokens);
  const res = await calendar.calendarList.list();

  return (res.data.items || []).map((cal) => ({
    id: cal.id!,
    summary: cal.summary || "Untitled",
    primary: cal.primary || false,
  }));
}

export async function fetchEvents(
  tokens: GoogleTokens,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const calendar = createCalendarClient(tokens);

  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  return (res.data.items || []).map((event) => {
    const allDay = !!event.start?.date;
    return {
      id: event.id!,
      summary: event.summary || "Untitled Event",
      description: event.description || undefined,
      start: allDay
        ? new Date(event.start!.date!)
        : new Date(event.start!.dateTime!),
      end: allDay
        ? new Date(event.end!.date!)
        : new Date(event.end!.dateTime!),
      allDay,
      calendarId,
    };
  });
}

export async function createEvent(
  tokens: GoogleTokens,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    colorId?: string;
  }
): Promise<string> {
  const calendar = createCalendarClient(tokens);

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
      colorId: event.colorId,
    },
  });

  return res.data.id!;
}

export async function deleteEvent(
  tokens: GoogleTokens,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = createCalendarClient(tokens);
  await calendar.events.delete({ calendarId, eventId });
}

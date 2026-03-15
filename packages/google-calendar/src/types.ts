export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarId: string;
}

export interface CalendarList {
  id: string;
  summary: string;
  primary: boolean;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
}

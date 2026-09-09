export interface Guest {
  name: string;
  email: string;
}
export interface CalendarRef {
  id: string;
  title: string;
  source: string;
  writable: boolean;
}
export interface HistoricalEvent {
  id: string;
  calendarId: string;
  title: string;
  start: string;
  end: string;
  timeZone: string;
  location: string;
  notes: string;
  attendees: Guest[];
  allDay: boolean;
}
export interface CalendarHistory {
  calendars: CalendarRef[];
  events: HistoricalEvent[];
  truncated: boolean;
}
export interface Conversation {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  participants: Guest[];
  summary: string;
  url: string;
}
export interface Transcript extends Conversation {
  text: string;
  truncated: boolean;
}
export interface ProposedMeeting {
  title: string;
  date: string;
  time: string;
  timeZone: string;
  durationMinutes: number;
  attendees: Guest[];
  description: string;
  location: string;
  googleMeet: boolean;
  calendarHint: string;
  reasoning: string;
  assumptions: string[];
  historyIds: string[];
}
export type ProposalResult =
  | { status: "ready"; event: ProposedMeeting }
  | { status: "clarify"; question: string };
export interface PlanningContext {
  history: CalendarHistory;
  transcript?: Transcript;
  now: string;
  timeZone: string;
  prompt: string;
}

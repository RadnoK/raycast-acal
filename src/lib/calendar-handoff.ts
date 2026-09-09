import { localToInstant } from "./time";
import type { ProposedMeeting } from "./types";
export const GOOGLE_CALENDAR_STORE =
  "https://www.raycast.com/thomas/google-calendar";
export function googleCalendarContext(event: ProposedMeeting) {
  const startDate = localToInstant(event.date, event.time, event.timeZone);
  const description = [
    event.description,
    event.location ? `Location: ${event.location}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    calendar: "primary",
    title: event.title,
    startDate,
    duration: `${event.durationMinutes}min`,
    attendees: event.attendees.map((a) => a.email).join(", "),
    conferencingProvider: event.googleMeet ? "hangoutsMeet" : "none",
    description,
    sendInvitations: event.attendees.length ? "all" : "none",
  };
}

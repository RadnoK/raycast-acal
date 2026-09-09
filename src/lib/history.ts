import type { HistoricalEvent, PlanningContext } from "./types";
const stop = new Set([
  "sync",
  "meeting",
  "spotkanie",
  "jutro",
  "dzisiaj",
  "zwykle",
  "next",
  "with",
  "time",
  "follow",
  "plan",
  "schedule",
  "propose",
  "from",
  "this",
  "pl",
]);
export function words(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .match(/[\p{L}\p{N}@.]+/gu)
      ?.filter((w) => w.length > 2 && !stop.has(w)) || []
  );
}
export function relevantHistory(
  events: HistoricalEvent[],
  query: string,
  participantEmails: string[] = [],
  limit = 24,
): HistoricalEvent[] {
  const tokens = new Set(words(query));
  const emails = new Set(participantEmails.map((s) => s.toLowerCase()));
  return events
    .map((event) => {
      const titleWords = words(event.title);
      const names = words(
        event.attendees.map((a) => `${a.name} ${a.email}`).join(" "),
      );
      const score =
        titleWords.reduce((n, w) => n + (tokens.has(w) ? 5 : 0), 0) +
        names.reduce((n, w) => n + (tokens.has(w) ? 2 : 0), 0) +
        event.attendees.reduce(
          (n, a) => n + (emails.has(a.email.toLowerCase()) ? 4 : 0),
          0,
        );
      return { event, score };
    })
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.event.start) - Date.parse(a.event.start),
    )
    .slice(0, limit)
    .map((x) => x.event);
}
export function selectContext(context: PlanningContext): PlanningContext {
  const past = context.history.events.filter(
    (e) => Date.parse(e.start) < Date.parse(context.now),
  );
  const selected = relevantHistory(
    past,
    `${context.prompt} ${context.transcript?.title || ""}`,
    context.transcript?.participants.map((p) => p.email) || [],
  );
  const calendarIds = new Set(selected.map((e) => e.calendarId));
  return {
    ...context,
    history: {
      ...context.history,
      calendars: context.history.calendars.filter((c) => calendarIds.has(c.id)),
      events: selected,
    },
  };
}
export function overlap(
  events: HistoricalEvent[],
  start: Date,
  durationMinutes: number,
): HistoricalEvent[] {
  const end = start.getTime() + durationMinutes * 60_000;
  return events.filter(
    (e) =>
      !e.allDay &&
      Date.parse(e.start) < end &&
      Date.parse(e.end) > start.getTime(),
  );
}

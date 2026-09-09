import { test } from "node:test";
import assert from "node:assert/strict";
import { localToInstant } from "../src/lib/time";
import { relevantHistory, selectContext, overlap } from "../src/lib/history";
import { parseProposal, planningPrompt } from "../src/lib/proposal";
import { googleCalendarContext } from "../src/lib/calendar-handoff";
import type {
  HistoricalEvent,
  PlanningContext,
  ProposedMeeting,
} from "../src/lib/types";

const history: HistoricalEvent = {
  id: "actual-event",
  calendarId: "work",
  title: "JEB Sync",
  start: "2026-09-01T15:00:00Z",
  end: "2026-09-01T15:30:00Z",
  timeZone: "Europe/Warsaw",
  location: "",
  notes: "",
  attendees: [{ name: "Mike", email: "mike@example.com" }],
  allDay: false,
};
const context: PlanningContext = {
  now: "2026-09-08T10:00:00Z",
  timeZone: "Europe/Warsaw",
  prompt: "JEB Sync jutro 17:00 PL z Mike",
  history: {
    events: [history],
    calendars: [
      { id: "work", title: "Work", source: "Google", writable: true },
    ],
    truncated: false,
  },
};
const event: ProposedMeeting = {
  title: "JEB Sync",
  date: "2026-09-09",
  time: "17:00",
  timeZone: "Europe/Warsaw",
  durationMinutes: 30,
  attendees: history.attendees,
  description: "Postęp projektu",
  location: "",
  googleMeet: true,
  calendarHint: "Work",
  reasoning: "Poprzedni JEB Sync",
  assumptions: [],
  historyIds: ["actual-event"],
};
const proposal = (changes: Partial<ProposedMeeting> = {}) =>
  JSON.stringify({ status: "ready", event: { ...event, ...changes } });

test("PL time follows summer and winter offsets, independently from host timezone", () => {
  assert.equal(
    localToInstant("2026-09-09", "17:00", "Europe/Warsaw").toISOString(),
    "2026-09-09T15:00:00.000Z",
  );
  assert.equal(
    localToInstant("2026-12-09", "17:00", "Europe/Warsaw").toISOString(),
    "2026-12-09T16:00:00.000Z",
  );
  assert.equal(
    localToInstant("2026-09-09", "17:00", "Asia/Kathmandu").toISOString(),
    "2026-09-09T11:15:00.000Z",
  );
});
test("rejects DST gap, duplicated hour, invalid dates and timezone", () => {
  assert.throws(
    () => localToInstant("2026-03-29", "02:30", "Europe/Warsaw"),
    /does not exist/,
  );
  assert.throws(
    () => localToInstant("2026-10-25", "02:30", "Europe/Warsaw"),
    /occurs twice/,
  );
  assert.throws(() => localToInstant("2026-02-30", "17:00", "Europe/Warsaw"));
  assert.throws(() => localToInstant("2026-09-09", "24:00", "Europe/Warsaw"));
  assert.throws(() => localToInstant("2026-09-09", "17:00", "Poland/fake"));
});
test("retrieval uses title or real attendee identity and ignores unrelated events", () => {
  const unrelated = {
    ...history,
    id: "other",
    title: "Dentysta",
    attendees: [],
  };
  assert.deepEqual(relevantHistory([unrelated, history], "JEB Sync"), [
    history,
  ]);
  assert.deepEqual(relevantHistory([unrelated, history], "z Mike"), [history]);
  assert.deepEqual(relevantHistory([unrelated], "Reflex jak zwykle"), []);
});
test("future events and unrelated calendar metadata are excluded from history sent to AI", () => {
  const future = { ...history, id: "future", start: "2026-09-10T15:00:00Z" };
  const selected = selectContext({
    ...context,
    history: {
      ...context.history,
      events: [history, future],
      calendars: [
        ...context.history.calendars,
        { id: "private", title: "Private", source: "iCloud", writable: true },
      ],
    },
  });
  assert.deepEqual(
    selected.history.events.map((e) => e.id),
    ["actual-event"],
  );
  assert.deepEqual(
    selected.history.calendars.map((c) => c.id),
    ["work"],
  );
});
test("accepts verified addresses and rejects invented guests and history", () => {
  assert.equal(parseProposal(proposal(), context).status, "ready");
  assert.throws(
    () =>
      parseProposal(
        proposal({
          attendees: [{ name: "Mike", email: "made-up@example.com" }],
        }),
        context,
      ),
    /No verified/,
  );
  assert.throws(
    () => parseProposal(proposal({ historyIds: ["invented"] }), context),
    /outside/,
  );
  assert.equal(
    parseProposal(
      proposal({ attendees: [{ name: "New", email: "new@example.com" }] }),
      { ...context, prompt: "Spotkanie jutro z new@example.com" },
    ).status,
    "ready",
  );
});
test("deduplicates addresses case-insensitively and never creates a past proposal", () => {
  const result = parseProposal(
    proposal({
      attendees: [
        ...history.attendees,
        { name: "Mike", email: "MIKE@example.com" },
      ],
    }),
    context,
  );
  assert.equal(result.status === "ready" && result.event.attendees.length, 1);
  assert.equal(
    parseProposal(proposal({ date: "2026-09-01" }), context).status,
    "clarify",
  );
});
test("malformed, incomplete, oversized and out-of-range AI responses fail closed", () => {
  for (const input of [
    "hello",
    "{}",
    "x".repeat(40_001),
    proposal({ durationMinutes: -30 }),
    proposal({ title: "" }),
  ])
    assert.throws(() => parseProposal(input, context));
  assert.equal(
    parseProposal("```json\n" + proposal() + "\n```", context).status,
    "ready",
  );
  assert.equal(
    parseProposal(
      JSON.stringify({ status: "clarify", question: "Który Mike?" }),
      context,
    ).status,
    "clarify",
  );
});
test("transcript participants are evidence and transcript dates remain anchored to recording", () => {
  const c = {
    ...context,
    transcript: {
      id: "ff1",
      title: "Call",
      date: "2026-09-01T10:00:00Z",
      durationMinutes: 30,
      participants: [{ name: "Jane", email: "jane@example.com" }],
      summary: "Meet next week",
      url: "https://app.fireflies.ai/view/ff1",
      text: "Tomorrow at five",
      truncated: false,
    },
  };
  assert.equal(
    parseProposal(proposal({ attendees: c.transcript.participants }), c).status,
    "ready",
  );
  assert.match(planningPrompt(c), /relative to the date of that conversation/);
  assert.match(planningPrompt(c), /UNTRUSTED DATA/);
  assert.match(planningPrompt(c), /2026-09-01T10:00:00Z/);
});
test("handoff contains editable native form fields and the correct absolute instant", () => {
  const form = googleCalendarContext(event);
  assert.equal(form.startDate.toISOString(), "2026-09-09T15:00:00.000Z");
  assert.equal(form.duration, "30min");
  assert.equal(form.attendees, "mike@example.com");
  assert.equal(form.calendar, "primary");
  assert.equal(form.conferencingProvider, "hangoutsMeet");
  const solo = googleCalendarContext({
    ...event,
    attendees: [],
    googleMeet: false,
    location: "Biuro",
  });
  assert.equal(solo.sendInvitations, "none");
  assert.equal(solo.conferencingProvider, "none");
  assert.match(solo.description, /Location: Biuro/);
});
test("overlap treats adjacent meetings as free and includes partial overlaps", () => {
  assert.equal(overlap([history], new Date(history.end), 30).length, 0);
  assert.equal(
    overlap([history], new Date("2026-09-01T15:15:00Z"), 30).length,
    1,
  );
});

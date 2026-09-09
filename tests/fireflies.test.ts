import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseConversations,
  parseTranscript,
  summaryText,
  toolData,
} from "../src/lib/fireflies-data";

const meeting = {
  id: "ff1",
  title: "Team Sync",
  date: 1788256800000,
  duration: 45,
  participants: ["mike@example.com"],
  meeting_attendees: [{ displayName: "Mike", email: "mike@example.com" }],
  summary: { overview: "Review", action_items: "Book follow-up" },
};
test("reads JSON MCP text and structured content", () => {
  for (const data of [[meeting], { data: { transcripts: [meeting] } }]) {
    assert.equal(
      parseConversations(
        toolData({ content: [{ type: "text", text: JSON.stringify(data) }] }),
      )[0].id,
      "ff1",
    );
    assert.equal(
      parseConversations(toolData({ structuredContent: data }))[0].id,
      "ff1",
    );
  }
});
test("normalizes real participants and preserves action items", () => {
  const result = parseConversations({ transcripts: [meeting] })[0];
  assert.deepEqual(result.participants, [
    { name: "Mike", email: "mike@example.com" },
  ]);
  assert.match(result.summary, /Book follow-up/);
  assert.ok(result.date.endsWith("Z"));
  assert.equal(
    summaryText({ data: { summary: "Plain summary" } }),
    "Plain summary",
  );
});
test("unexpected payload and tool errors do not look like an empty list", () => {
  assert.throws(() => toolData({ isError: true, content: [] }));
  assert.throws(() =>
    toolData({ content: [{ type: "text", text: "not json" }] }),
  );
  assert.throws(() => parseConversations({ data: { error: "forbidden" } }));
  assert.throws(() => parseConversations({ unexpected: [] }));
  assert.deepEqual(parseConversations({ transcripts: [] }), []);
});
test("only a selected meeting transcript is used, with bounded text retaining final actions", () => {
  const fallback = parseConversations([meeting])[0];
  const result = parseTranscript(
    {
      data: {
        transcript: {
          id: "ff1",
          sentences: [
            { speaker_name: "Mike", text: "A".repeat(65_000) },
            { speaker_name: "Mike", text: "Final action: follow-up Tuesday" },
          ],
        },
      },
    },
    { summary: { action_items: "Follow-up Tuesday" } },
    fallback,
  );
  assert.equal(result.truncated, true);
  assert.ok(result.text.length < 51_000);
  assert.match(result.text, /Final action: follow-up Tuesday$/);
  assert.deepEqual(result.participants, fallback.participants);
  assert.equal(result.date, fallback.date);
  assert.throws(() => parseTranscript({}, {}, fallback));
});
test("provider URLs cannot redirect to untrusted domains", () => {
  assert.equal(
    parseConversations([
      { ...meeting, transcript_url: "https://evil.example/steal" },
    ])[0].url,
    "https://app.fireflies.ai/view/ff1",
  );
});

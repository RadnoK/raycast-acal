import type { Conversation, Guest, Transcript } from "./types";
type RecordValue = Record<string, unknown>;
const object = (v: unknown): RecordValue =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as RecordValue) : {};
const string = (v: unknown): string => (typeof v === "string" ? v : "");

export function toolData(result: unknown): unknown {
  const r = object(result);
  if (r.isError)
    throw new Error(
      "Fireflies returned no data. Check your access to the meeting and try again.",
    );
  if (r.structuredContent) return r.structuredContent;
  const blocks = Array.isArray(r.content) ? r.content : [];
  const text = blocks
    .map(object)
    .filter((b) => b.type === "text")
    .map((b) => string(b.text))
    .join("\n");
  try {
    return JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    );
  } catch {
    throw new Error(
      "Fireflies returned an unsupported response format. Expected JSON.",
    );
  }
}

function unwrap(value: unknown, keys: string[]): unknown {
  let v = value;
  for (let i = 0; i < 5; i++) {
    const o = object(v);
    if (o.errors || o.error)
      throw new Error("Fireflies could not read this meeting.");
    const key = keys.find((k) => o[k] !== undefined);
    if (!key) return v;
    v = o[key];
  }
  return v;
}

function guests(v: RecordValue): Guest[] {
  const values = [
    ...(Array.isArray(v.participants) ? v.participants : []),
    ...(Array.isArray(v.meeting_attendees) ? v.meeting_attendees : []),
  ];
  const entries = values
    .map((value) => {
      const p = object(value);
      return {
        email: (typeof value === "string" ? value : string(p.email))
          .trim()
          .toLowerCase(),
        name: string(p.displayName) || string(p.name),
      };
    })
    .filter((p) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email));
  return [...new Map(entries.map((p) => [p.email, p])).values()];
}

export function summaryText(value: unknown): string {
  const unwrapped = unwrap(value, ["data", "transcript", "summary"]);
  if (typeof unwrapped === "string") return unwrapped.slice(0, 24_000);
  const summary = object(unwrapped);
  return [
    "overview",
    "short_summary",
    "action_items",
    "outline",
    "notes",
    "topics_discussed",
    "keywords",
  ]
    .flatMap((key) => {
      const v = summary[key];
      return v
        ? [
            `${key.replaceAll("_", " ")}:\n${typeof v === "string" ? v : JSON.stringify(v)}`,
          ]
        : [];
    })
    .join("\n\n")
    .slice(0, 24_000);
}

function conversation(value: unknown): Conversation {
  const v = object(value);
  const id = string(v.id) || string(v.transcript_id);
  if (!id) throw new Error("The Fireflies response is missing a meeting ID.");
  const rawDate = v.dateString ?? v.date ?? v.start_time;
  const date = new Date(
    typeof rawDate === "number"
      ? rawDate < 1e11
        ? rawDate * 1000
        : rawDate
      : string(rawDate),
  );
  const rawUrl = string(v.transcript_url);
  let url = `https://app.fireflies.ai/view/${encodeURIComponent(id)}`;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "https:" && parsed.hostname === "app.fireflies.ai")
      url = parsed.toString();
  } catch {
    /* Use the canonical meeting URL. */
  }
  return {
    id,
    title: string(v.title) || "Untitled Meeting",
    date: Number.isFinite(date.getTime()) ? date.toISOString() : "",
    durationMinutes: typeof v.duration === "number" ? v.duration : 0,
    participants: guests(v),
    summary: summaryText(v.summary),
    url,
  };
}

export function parseConversations(data: unknown): Conversation[] {
  const list = unwrap(data, ["data", "transcripts", "meetings", "results"]);
  if (!Array.isArray(list))
    throw new Error("Fireflies returned an unexpected meeting list format.");
  return list.map(conversation);
}

export function parseTranscript(
  data: unknown,
  summary: unknown,
  fallback: Conversation,
): Transcript {
  const v = object(unwrap(data, ["data", "transcript"]));
  if (!Array.isArray(v.sentences))
    throw new Error("The transcript for this meeting is not available yet.");
  const fullText = v.sentences
    .map(object)
    .map((s) => `${string(s.speaker_name) || "Participant"}: ${string(s.text)}`)
    .join("\n");
  const truncated = fullText.length > 50_000;
  const text = truncated
    ? `${fullText.slice(0, 8_000)}\n[Middle of transcript omitted]\n${fullText.slice(-42_000)}`
    : fullText;
  const details = conversation({ ...v, id: v.id || fallback.id });
  return {
    ...fallback,
    ...details,
    title: string(v.title) || fallback.title,
    durationMinutes: details.durationMinutes || fallback.durationMinutes,
    date: details.date || fallback.date,
    participants: details.participants.length
      ? details.participants
      : fallback.participants,
    summary: summaryText(summary) || fallback.summary,
    text,
    truncated,
  };
}
